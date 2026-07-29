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
const [carType,setCarType]=useState("");
const [color,setColor]=useState("");
const [plate,setPlate]=useState("");

const [services,setServices]=useState([]);

const [serviceDetails,setServiceDetails]=useState({});


const [serviceList,setServiceList]=useState([]);



useEffect(()=>{

loadJob();

loadServices();

},[]);



async function loadServices(){

const {data,error}=await supabase

.from("services")

.select("*");


if(error){

console.log(error);

return;

}


setServiceList(data || []);

}




async function loadJob(){


const {data,error}=await supabase

.from("jobs")

.select("*")

.eq("id",Number(id))

.single();



if(error){

console.log(error);

return;

}



setCustomer(data.customer || "");

setPhone(data.phone || "");

setCarModel(data.carModel || "");

setCarType(data.carType || "");

setColor(data.color || "");

setPlate(data.plate || "");


setServices(data.services || []);

setServiceDetails(data.serviceDetails || {});


setLoading(false);


}





function toggleService(serviceItem){


const service=serviceItem.name;


if(services.includes(service)){


setServices(

services.filter(
s=>s!==service
)

);



const copy={...serviceDetails};

delete copy[service];

setServiceDetails(copy);


}

else{


setServices([

...services,

service

]);



setServiceDetails({

...serviceDetails,


[service]:{

price:serviceItem.price,

discount:0

}

});


}



}






async function save(){


const total = services.reduce(

(sum,service)=>

sum +

Number(
serviceDetails[service]?.price || 0
),

0

);



const {error}=await supabase

.from("jobs")

.update({


customer,

phone,

carModel,

carType,

color,

plate,


services,


serviceDetails,


price:total



})

.eq(

"id",

Number(id)

);





if(error){

alert(error.message);

return;

}



alert("Job Updated");


navigate(`/jobs/${id}`);



}







if(loading){

return <h2>Loading...</h2>;

}





return(

<div style={styles.page}>


<h1>
Edit Job
</h1>



<h2>
Customer
</h2>


<input

value={customer}

onChange={(e)=>setCustomer(e.target.value)}

placeholder="Customer"

/>



<input

value={phone}

onChange={(e)=>setPhone(e.target.value)}

placeholder="Phone"

/>





<h2>
Vehicle
</h2>



<input

value={carModel}

onChange={(e)=>setCarModel(e.target.value)}

placeholder="Model"

/>



<input

value={carType}

onChange={(e)=>setCarType(e.target.value)}

placeholder="Type"

/>



<input

value={color}

onChange={(e)=>setColor(e.target.value)}

placeholder="Color"

/>



<input

value={plate}

onChange={(e)=>setPlate(e.target.value)}

placeholder="Plate"

/>






<h2>
Services
</h2>




{

serviceList.map(item=>(


<div key={item.id}>


<label>


<input

type="checkbox"

checked={services.includes(item.name)}

onChange={()=>toggleService(item)}

/>


{" "}

{item.name}


</label>





{

services.includes(item.name)

&&


<div>


<input

type="number"

value={
serviceDetails[item.name]?.price || 0
}

onChange={(e)=>{


setServiceDetails({

...serviceDetails,


[item.name]:{

...serviceDetails[item.name],

price:Number(e.target.value)

}

});


}}

/>



<input

type="number"

value={
serviceDetails[item.name]?.discount || 0
}

onChange={(e)=>{


setServiceDetails({

...serviceDetails,


[item.name]:{

...serviceDetails[item.name],

discount:Number(e.target.value)

}

});


}}

/>



</div>


}



</div>


))

}






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

gap:"12px",

maxWidth:"600px"

}


};



export default EditJob;