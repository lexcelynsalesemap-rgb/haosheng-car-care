import { useState } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";


function Login(){

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();


  async function login() {
  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  // -----------------------------------
  // SUPABASE AUTH LOGIN
  // -----------------------------------

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

  console.log("AUTH DATA:", authData);
  console.log("AUTH ERROR:", authError);

  if (authError || !authData?.user) {
    alert(
      authError?.message ||
      "Wrong email or password"
    );
    return;
  }

  // -----------------------------------
  // LOAD PUBLIC USER
  // -----------------------------------

  const authUserId = authData.user.id;

  const {
    data: publicUser,
    error: publicUserError
  } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  console.log("PUBLIC USER:", publicUser);
  console.log(
    "PUBLIC USER ERROR:",
    publicUserError
  );

  if (publicUserError) {
    console.error(
      "PUBLIC USER ERROR:",
      publicUserError
    );

    alert(
      "Login succeeded, but your shop profile could not be loaded."
    );

    return;
  }

  if (!publicUser) {
    alert(
      "Login succeeded, but this account is not connected to a shop."
    );

    return;
  }

  // -----------------------------------
  // SAVE USER
  // -----------------------------------

  localStorage.setItem(
    "user",
    JSON.stringify(publicUser)
  );

  console.log(
    "LOGGED IN SHOP:",
    publicUser.shop_id
  );

  alert("Login successful");

  navigate("/");
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
        onChange={(e)=>setEmail(e.target.value)}
      />


      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />


      <button onClick={login}>
        Login
      </button>


    </div>

  );

}


export default Login;