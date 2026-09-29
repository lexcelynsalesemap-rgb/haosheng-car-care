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
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Only POST requests are allowed.",
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

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Unauthorized. No authorization header.",
        },
        401
      );
    }

    // -----------------------------------
    // USER CLIENT
    // -----------------------------------

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // -----------------------------------
    // CHECK CURRENT USER
    // -----------------------------------

    const {
      data: userData,
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      console.error(
        "GET CURRENT USER ERROR:",
        userError
      );

      return jsonResponse(
        {
          error: "Unauthorized.",
        },
        401
      );
    }

    const currentUser = userData.user;

    console.log(
      "CURRENT AUTH USER:",
      currentUser.id
    );

    // -----------------------------------
    // ADMIN CLIENT
    // -----------------------------------

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured."
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // -----------------------------------
    // CHECK ADMIN
    // -----------------------------------

    const {
      data: adminUser,
      error: adminError,
    } = await adminClient
      .from("users")
      .select("id, role")
      .eq(
        "auth_user_id",
        currentUser.id
      )
      .single();

    if (adminError) {
      console.error(
        "ADMIN LOOKUP ERROR:",
        adminError
      );

      return jsonResponse(
        {
          error:
            "Could not verify administrator account.",
        },
        500
      );
    }

    if (
      !adminUser ||
      adminUser.role !== "admin"
    ) {
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
    const newPassword = body?.new_password;

    console.log(
      "TARGET DATABASE USER:",
      userId
    );

    if (!userId) {
      return jsonResponse(
        {
          error: "User ID is required.",
        },
        400
      );
    }

    if (!newPassword) {
      return jsonResponse(
        {
          error: "New password is required.",
        },
        400
      );
    }

    if (
      typeof newPassword !== "string"
    ) {
      return jsonResponse(
        {
          error: "Password must be text.",
        },
        400
      );
    }

    if (newPassword.length < 6) {
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
        "id, name, email, role, auth_user_id"
      )
      .eq("id", userId)
      .single();

    if (targetUserError) {
      console.error(
        "TARGET USER ERROR:",
        targetUserError
      );

      return jsonResponse(
        {
          error: "User not found.",
        },
        404
      );
    }

    if (!targetUser) {
      return jsonResponse(
        {
          error: "User not found.",
        },
        404
      );
    }

    // -----------------------------------
    // CHECK AUTH USER ID
    // -----------------------------------

    if (!targetUser.auth_user_id) {
      return jsonResponse(
        {
          error:
            "This user is not connected to Supabase Auth.",
        },
        400
      );
    }

    console.log(
      "TARGET AUTH USER:",
      targetUser.auth_user_id
    );

    // -----------------------------------
    // CHANGE PASSWORD
    // -----------------------------------

    const {
      data: updatedUser,
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
        "SUPABASE PASSWORD UPDATE ERROR:",
        updateError
      );

      return jsonResponse(
        {
          error: updateError.message,
        },
        400
      );
    }

    if (!updatedUser?.user) {
      return jsonResponse(
        {
          error:
            "Supabase did not return the updated user.",
        },
        500
      );
    }

    // -----------------------------------
    // SUCCESS
    // -----------------------------------

    console.log(
      "PASSWORD CHANGED SUCCESSFULLY FOR:",
      targetUser.email
    );

    return jsonResponse({
      success: true,
      message: "Password changed successfully.",
    });

  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    let message =
      "Failed to change password.";

    if (error instanceof Error) {
      message = error.message;
    }

    return jsonResponse(
      {
        error: message,
      },
      500
    );
  }
});
