import { useState } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function login() {
    if (loading) return;

    if (!email.trim() || !password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------------
      // SIGN IN WITH SUPABASE AUTH
      // -----------------------------------

      console.log("LOGIN: signing in...");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log("AUTH DATA:", authData);
      console.log("AUTH ERROR:", authError);

      if (authError) {
        throw authError;
      }

      if (!authData?.user) {
        throw new Error(
          "Supabase did not return a user."
        );
      }

      if (!authData?.session) {
        throw new Error(
          "Supabase login succeeded but no session was returned."
        );
      }

      console.log(
        "AUTH USER ID:",
        authData.user.id
      );

      console.log(
        "AUTH SESSION EXISTS:",
        !!authData.session
      );

      // -----------------------------------
      // VERIFY SESSION WAS SAVED
      // -----------------------------------

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log(
        "SESSION AFTER LOGIN:",
        sessionData
      );

      console.log(
        "SESSION ERROR AFTER LOGIN:",
        sessionError
      );

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData?.session) {
        throw new Error(
          "Login succeeded, but Supabase did not save the login session."
        );
      }

      // -----------------------------------
      // LOAD PUBLIC USER
      // -----------------------------------

      const authUserId = authData.user.id;

      console.log(
        "LOADING PUBLIC USER FOR:",
        authUserId
      );

     const {
  data: publicUser,
  error: publicUserError
} = await supabase
  .from("users")
  .select(
    "id, name, email, role, shop_id, auth_user_id"
  )
  .eq("auth_user_id", authUserId)
  .maybeSingle();


      console.log(
        "PUBLIC USER:",
        publicUser
      );

      console.log(
        "PUBLIC USER ERROR:",
        publicUserError
      );

      if (publicUserError) {
        throw new Error(
          publicUserError.message ||
            "Could not load your shop profile."
        );
      }

      if (!publicUser) {
        throw new Error(
          "Login succeeded, but this account is not connected to a shop."
        );
      }

      // -----------------------------------
      // SAVE PUBLIC USER
      // -----------------------------------

      localStorage.setItem(
        "user",
        JSON.stringify(publicUser)
      );

      console.log(
        "LOGGED IN SHOP:",
        publicUser.shop_id
      );

      console.log(
        "LOGIN COMPLETE"
      );

      alert("Login successful.");

      navigate("/");

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Login failed."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>
        🚗 Haosheng Login
      </h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        disabled={loading}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        disabled={loading}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button
        onClick={login}
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}

export default Login;
