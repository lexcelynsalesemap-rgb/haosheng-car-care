import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";


function TechnicianEarnings(){

const [technicians,setTechnicians]=useState([]);

const [jobs,setJobs]=useState([]);


// LOAD DATA

async function loadData(){


const {data:techData,error:techError}=await supabase

.from("technicians")

.select("*");


if(techError){

console.log(techError);

return;

}



const {data:jobData,error:jobError}=await supabase

.from("jobs")

.select("*");


if(jobError){

console.log(jobError);

return;

}



setTechnicians(techData || []);

setJobs(jobData || []);


}



useEffect(()=>{

loadData();

},[]);





// CALCULATE EARNINGS

function calculateEarnings(technicianID){


let total=0;

let jobCount=0;



jobs.forEach(job=>{


let found=false;


job.services?.forEach(service=>{


const details =
job.serviceDetails?.[service];



if(

details?.technicians?.includes(technicianID)

){


found=true;


let techCount =
details.technicians.length;



let share =
Number(details.price || 0)
/ techCount;



total += share;


}


});



if(found){

jobCount++;

}


});



return {

jobs:jobCount,

earnings:total

};


}







return (

<div style={styles.page}>


<h1>
Technician Earnings
</h1>



<div style={styles.card}>


<table style={styles.table}>


<thead>

<tr>

<th>
Technician
</th>


<th>
Completed Jobs
</th>


<th>
Earnings
</th>


</tr>

</thead>



<tbody>


{

technicians.map(tech=>{


const result =
calculateEarnings(tech.id);



return (

<tr key={tech.id}>


<td>
{tech.name}
</td>


<td>
{result.jobs}
</td>


<td>
QAR {result.earnings.toFixed(2)}
</td>


</tr>


)


})

}



</tbody>


</table>


</div>


</div>


);


}



const styles={


page:{

padding:"30px",

background:"var(--bg)",

minHeight:"100vh"

},


card:{

background:"white",

padding:"25px",

borderRadius:"15px"

},


table:{

width:"100%",

borderCollapse:"collapse"

}


};



export default TechnicianEarnings;