import { useState } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";


function Login(){

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();


  async function login(){

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();


    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);


    if(error || !data){

      alert("Wrong email or password");
      return;

    }


    localStorage.setItem(
      "user",
      JSON.stringify(data)
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