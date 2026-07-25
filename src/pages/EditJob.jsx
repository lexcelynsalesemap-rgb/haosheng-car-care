import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useParams, useNavigate } from "react-router-dom";


function EditJob(){

const {id}=useParams();

const navigate=useNavigate();


const [loading,setLoading]=useState(true);


const [customer,setCustomer]=useState("");
const [phone,setPhone]=useState("");
const [carModel,setCarModel]=useState("");
const [plate,setPlate]=useState("");
const [price,setPrice]=useState(0);
const [status,setStatus]=useState("New");




useEffect(()=>{

loadJob();

},[]);




async function loadJob(){


const {data,error}=await supabase

.from("jobs")

.select("*")

.eq("id",id)

.single();



if(error){

console.error(error);

return;

}



setCustomer(data.customer || "");

setPhone(data.phone || "");

setCarModel(data.carModel || "");

setPlate(data.plate || "");

setPrice(data.price || 0);

setStatus(data.status || "New");


setLoading(false);


}






async function save(){


const {error}=await supabase

.from("jobs")

.update({

customer,

phone,

carModel,

plate,

price,

status

})

.eq("id",id);



if(error){

alert(error.message);

return;

}



alert("Job Updated");


navigate("/jobs");


}






if(loading){

return <h2>Loading...</h2>

}




return(


<div style={styles.page}>


<h1>
Edit Job
</h1>




<input

value={customer}

placeholder="Customer Name"

onChange={(e)=>setCustomer(e.target.value)}

/>



<input

value={phone}

placeholder="Phone"

onChange={(e)=>setPhone(e.target.value)}

/>




<input

value={carModel}

placeholder="Car Model"

onChange={(e)=>setCarModel(e.target.value)}

/>




<input

value={plate}

placeholder="Plate Number"

onChange={(e)=>setPlate(e.target.value)}

/>





<input

type="number"

value={price}

placeholder="Price"

onChange={(e)=>setPrice(Number(e.target.value))}

/>





<select

value={status}

onChange={(e)=>setStatus(e.target.value)}

>


<option>
New
</option>


<option>
In Progress
</option>


<option>
Finished
</option>


<option>
Delivered
</option>


</select>





<br/>
<br/>





<button onClick={save}>

SAVE CHANGES

</button>



</div>


);


}





const styles={

page:{

padding:"30px",

display:"flex",

flexDirection:"column",

gap:"15px",

maxWidth:"400px"

}

};



export default EditJob;