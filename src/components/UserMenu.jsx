import { useNavigate } from "react-router-dom";


function UserMenu(){

  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );


  function logout(){

    localStorage.removeItem("user");

    navigate("/login");

  }


  return (

    <div style={styles.box}>

      <div>
        👤 {user?.name || user?.email}
      </div>

      <div>
        Role: {user?.role || "User"}
      </div>


      <button
        onClick={logout}
        style={styles.button}
      >
        Logout
      </button>

    </div>

  );

}


const styles={

box:{
  display:"flex",
  alignItems:"center",
  gap:"15px",
  padding:"10px",
  background:"white",
  borderRadius:"10px"
},

button:{
  background:"#dc2626",
  color:"white",
  border:"none",
  padding:"8px 15px",
  borderRadius:"8px",
  cursor:"pointer"
}

};


export default UserMenu;