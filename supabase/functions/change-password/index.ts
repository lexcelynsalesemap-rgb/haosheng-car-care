import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

Deno.serve(async (req) => {
  // -----------------------------------
  // CORS
  // -----------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    // -----------------------------------
    // GET AUTHORIZATION HEADER
    // -----------------------------------

    const authHeader =
      req.headers.get("Authorization");

    console.log(
      "AUTH HEADER EXISTS:",
      !!authHeader
    );

    if (!authHeader) {
      return jsonResponse(
        {
          error:
            "Authorization header is missing.",
        },
        401
      );
    }

    // -----------------------------------
    // SUPABASE CLIENT USING USER TOKEN
    // -----------------------------------

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables."
      );

      return jsonResponse(
        {
          error:
            "Server configuration is incomplete.",
        },
        500
      );
    }

    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // -----------------------------------
    // VERIFY LOGGED-IN USER
    // -----------------------------------

    const {
      data: {
        user: currentUser,
      },
      error: currentUserError,
    } =
      await userClient.auth.getUser();

    console.log(
      "CURRENT USER:",
      currentUser?.id || null
    );

    console.log(
      "CURRENT USER ERROR:",
      currentUserError?.message || null
    );

    if (
      currentUserError ||
      !currentUser
    ) {
      return jsonResponse(
        {
          error:
            "Your Supabase login session is invalid or expired.",
        },
        401
      );
    }

    // -----------------------------------
    // ADMIN CLIENT
    // -----------------------------------

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // -----------------------------------
    // CHECK CURRENT USER IS ADMIN
    // -----------------------------------

    const {
      data: adminUser,
      error: adminUserError,
    } = await adminClient
      .from("users")
      .select(
        "id, role, auth_user_id"
      )
      .eq(
        "auth_user_id",
        currentUser.id
      )
      .maybeSingle();

    console.log(
      "ADMIN DATABASE USER:",
      adminUser
    );

    console.log(
      "ADMIN DATABASE ERROR:",
      adminUserError?.message || null
    );

    if (
      adminUserError ||
      !adminUser
    ) {
      return jsonResponse(
        {
          error:
            "Your account was not found in the users table.",
        },
        403
      );
    }

    if (adminUser.role !== "admin") {
      return jsonResponse(
        {
          error:
            "Only administrators can change passwords.",
        },
        403
      );
    }

    // -----------------------------------
    // READ REQUEST
    // -----------------------------------

    const body = await req.json();

    const userId = body?.user_id;
    const newPassword =
      body?.new_password;

    console.log(
      "TARGET DATABASE USER ID:",
      userId
    );

    if (!userId) {
      return jsonResponse(
        {
          error:
            "user_id is required.",
        },
        400
      );
    }

    if (!newPassword) {
      return jsonResponse(
        {
          error:
            "new_password is required.",
        },
        400
      );
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      return jsonResponse(
        {
          error:
            "Password must be at least 6 characters.",
        },
        400
      );
    }

    // -----------------------------------
    // FIND TARGET USER
    // -----------------------------------

    const {
      data: targetUser,
      error: targetUserError,
    } = await adminClient
      .from("users")
      .select(
        "id, name, email, auth_user_id"
      )
      .eq("id", userId)
      .maybeSingle();

    console.log(
      "TARGET USER:",
      targetUser
    );

    console.log(
      "TARGET USER ERROR:",
      targetUserError?.message || null
    );

    if (targetUserError) {
      throw targetUserError;
    }

    if (!targetUser) {
      return jsonResponse(
        {
          error:
            "Target user was not found.",
        },
        404
      );
    }

    if (!targetUser.auth_user_id) {
      return jsonResponse(
        {
          error:
            "Target user does not have a Supabase Auth account.",
        },
        400
      );
    }

    // -----------------------------------
    // CHANGE PASSWORD
    // -----------------------------------

    console.log(
      "CHANGING AUTH PASSWORD FOR:",
      targetUser.auth_user_id
    );

    const {
      data: updatedAuthUser,
      error: updateError,
    } =
      await adminClient.auth.admin.updateUserById(
        targetUser.auth_user_id,
        {
          password: newPassword,
        }
      );

    if (updateError) {
      console.error(
        "AUTH PASSWORD UPDATE ERROR:",
        updateError
      );

      return jsonResponse(
        {
          error:
            updateError.message ||
            "Could not change password.",
        },
        500
      );
    }

    console.log(
      "PASSWORD UPDATED:",
      !!updatedAuthUser?.user
    );

    // -----------------------------------
    // SUCCESS
    // -----------------------------------

    return jsonResponse({
      success: true,
      message:
        "Password changed successfully.",
    });

  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to change password.",
      },
      500
    );
  }
});
