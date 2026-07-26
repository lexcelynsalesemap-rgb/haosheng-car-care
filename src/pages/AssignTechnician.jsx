import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/client";


function AssignTechnician(){

const {id} = useParams();


const [services,setServices]=useState([]);
const [technicians,setTechnicians]=useState([]);
const [selected,setSelected]=useState({});



useEffect(()=>{

loadData();

},[]);



async function loadData(){


const {data:serviceData,error:serviceError}=await supabase
.from("job_services")
.select("*")
.eq("job_id",id);


console.log("JOB ID:",id);
console.log("SERVICES:",serviceData);
console.log("SERVICE ERROR:",serviceError);



const {data:techData,error:techError}=await supabase
.from("technicians")
.select("*")
.eq("active",true);


console.log("TECHNICIANS:",techData);
console.log("TECH ERROR:",techError);


setServices(serviceData || []);
setTechnicians(techData || []);

}
function changeTech(serviceID,techID,checked){


const old =
selected[serviceID] || [];



let updated;


if(checked){

updated=[
...old,
{
technician_id:techID,
commission:0
}
];

}
else{

updated=
old.filter(
t=>t.technician_id!==techID
);

}



setSelected({

...selected,

[serviceID]:updated

});


}




function changeCommission(serviceID,techID,value){


const updated =
selected[serviceID].map(t=>{


if(t.technician_id===techID){

return {

...t,

commission:Number(value)

};

}


return t;


});



setSelected({

...selected,

[serviceID]:updated

});


}




async function save(){


for(const service of services){


const rows =
(selected[service.id] || [])
.map(t=>({

service_id:service.id,

technician_id:t.technician_id,

commission:t.commission

}));



if(rows.length){


await supabase
.from("service_technicians")
.upsert(rows);


}


}


alert("Technicians Assigned");


}



return (

<div style={{padding:"30px"}}>


<h1>
Assign Technician
</h1>



{

services.map(service=>(


<div key={service.id}
style={{
background:"white",
padding:"20px",
marginBottom:"20px",
borderRadius:"15px"
}}
>


<h2>
{service.service_name}
</h2>

<p>
Price: QAR {service.price}
</p>



{
technicians.map(tech=>{


const checked =
selected[service.id]
?.some(
t=>t.technician_id===tech.id
);



return (

<div key={tech.id}>


<label>

<input

type="checkbox"

checked={checked || false}

onChange={(e)=>
changeTech(
service.id,
tech.id,
e.target.checked
)
}

/>

{" "}

{tech.name}


</label>



{

checked &&

<input

type="number"

placeholder="Commission"

onChange={(e)=>
changeCommission(
service.id,
tech.id,
e.target.value
)
}

/>

}


</div>

);


})

}


</div>


))


}




<button

onClick={save}

style={{
background:"#16a34a",
color:"white",
padding:"12px 25px",
borderRadius:"10px"
}}

>

SAVE TECHNICIANS

</button>


</div>

);


}


export default AssignTechnician;