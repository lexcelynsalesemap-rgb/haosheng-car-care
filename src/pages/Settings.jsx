import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";


function Settings(){

const [services,setServices] = useState([]);

const [newName,setNewName] = useState("");
const [newPrice,setNewPrice] = useState("");



useEffect(()=>{

loadServices();

},[]);



async function loadServices(){

const {data,error}=await supabase
.from("services")
.select("*")
.order("id");


if(error){

console.log(error);
return;

}


setServices(data || []);

}





function changePrice(id,value){

setServices(

services.map(service=>

service.id===id

?

{
...service,
price:Number(value)
}

:

service

)

);

}





async function saveServices(){

for(const service of services){

await supabase
.from("services")
.update({

price:Number(service.price)

})

.eq("id",service.id);


}


alert("Prices Updated");


}




async function addService(){


if(!newName || !newPrice){

alert("Enter service name and price");
return;

}


const {data,error}=await supabase
.from("services")
.insert([{

name:newName,
price:Number(newPrice)

}])
.select()
.single();


if(error){

console.log(error);
return;

}


setServices([
...services,
data
]);


setNewName("");
setNewPrice("");


}





async function deleteService(id){


await supabase
.from("services")
.delete()
.eq("id",id);


setServices(

services.filter(
service=>service.id!==id
)

);


}





return(

<div style={{
padding:"30px"
}}>


<h1>
Settings
</h1>


<h2>
Service Prices
</h2>



{
services.map(service=>(


<div
key={service.id}
style={{
display:"flex",
gap:"15px",
marginBottom:"15px",
alignItems:"center"
}}
>


<input

value={service.name}

readOnly

style={{
width:"250px"
}}

/>


<input

type="number"

value={service.price}

onChange={(e)=>

changePrice(
service.id,
e.target.value
)

}

/>


<button

onClick={()=>deleteService(service.id)}

>

Delete

</button>



</div>


))
}



<button

onClick={saveServices}

>

SAVE PRICES

</button>




<hr/>

<h2>
Add New Service
</h2>


<input

placeholder="Service Name"

value={newName}

onChange={(e)=>setNewName(e.target.value)}

/>


<input

type="number"

placeholder="Price"

value={newPrice}

onChange={(e)=>setNewPrice(e.target.value)}

/>



<button

onClick={addService}

>

ADD SERVICE

</button>



</div>

);


}



export default Settings;