import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";


function TechnicianEarnings(){

const [earnings,setEarnings]=useState([]);


// LOAD COMMISSIONS

async function loadData(){

const {data,error}=await supabase

.from("service_technicians")

.select(`
  commission,

  technicians(
    name
  ),

  job_services(
    service_name,

    jobs(
      customer,
      carModel
    )
  )
`);



if(error){

console.log(error);
return;

}


setEarnings(data || []);

}




useEffect(()=>{

loadData();

},[]);





// GROUP BY TECHNICIAN

const summary = {};


earnings.forEach(row=>{


const name =
row.technicians?.name || "Unknown";


if(!summary[name]){

summary[name]={

jobs:0,

total:0

};

}



summary[name].jobs += 1;


summary[name].total +=
Number(row.commission || 0);



});






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
Services
</th>

<th>
Commission
</th>

</tr>

</thead>



<tbody>


{

Object.entries(summary).map(([name,data])=>(


<tr key={name}>


<td>
{name}
</td>


<td>
{data.jobs}
</td>


<td>
QAR {data.total.toFixed(2)}
</td>


</tr>


))


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