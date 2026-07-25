import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase/client";


function JobDetails(){


const {id}=useParams();


const [job,setJob]=useState(null);

const [technicians,setTechnicians]=useState([]);




// LOAD JOB

async function loadJob(){


const {data,error}=await supabase

.from("jobs")

.select("*")

.eq("id",id)

.single();



if(error){

console.log(error);

return;

}


setJob(data);


}




// LOAD TECHNICIANS

async function loadTechnicians(){


const {data,error}=await supabase

.from("technicians")

.select("*");



if(error){

console.log(error);

return;

}



setTechnicians(data);



}




useEffect(()=>{


loadJob();

loadTechnicians();


},[]);





if(!job){

return (

<h1>
Loading...
</h1>

);

}







function getTechnicianName(techID){


const tech = technicians.find(

t=>t.id===techID

);


return tech?.name || "Unknown";


}







return(


<div style={styles.page}>


<h1>
Job Details
</h1>





<div style={styles.card}>


<h2>
Customer Information
</h2>


<p>
Name:
{job.customer}
</p>


<p>
Phone:
{job.phone}
</p>


<p>
Date:
{job.date}
</p>



<p>
Source:
{job.source || "Not specified"}
</p>



{
job.voucherNumber &&

<p>
Voucher:
{job.voucherNumber}
</p>

}





<h2>
Vehicle Information
</h2>



<p>
Model:
{job.carModel}
</p>


<p>
Type:
{job.carType}
</p>


<p>
Color:
{job.color}
</p>


<p>
Chassis:
{job.chassis}
</p>


<p>
Plate:
{job.plate}
</p>





<h2>
Services
</h2>





{

job.services?.map(service=>(


<div

key={service}

style={styles.service}

>



<h3>
{service}
</h3>



<p>
Price:
QAR {job.serviceDetails?.[service]?.price || 0}
</p>



<p>
Discount:
QAR {job.serviceDetails?.[service]?.discount || 0}
</p>



<p>
Quantity:
{job.serviceDetails?.[service]?.quantity || 1}
</p>




<h4>
Technicians:
</h4>




{


job.serviceDetails?.[service]?.technicians?.length ?


job.serviceDetails[service].technicians.map(techID=>(


<p key={techID}>

👷 {getTechnicianName(techID)}

</p>


))


:

<p>
No technician assigned
</p>


}




</div>


))


}







<h2>
Payment
</h2>



<p>
Payment Method:
{job.paymentMethod || "Not Selected"}
</p>


<p>
Total:
QAR {job.price}
</p>


<p>
Discount:
QAR {job.discount}
</p>


<p>
Deposit:
QAR {job.deposit}
</p>



<h2>
Balance:
QAR {job.balance}
</h2>






<Link to={`/invoice/${job.id}`}>

<button style={styles.button}>
🧾 Invoice
</button>

</Link>





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

borderRadius:"15px",

maxWidth:"700px",

boxShadow:"0 5px 15px rgba(0,0,0,.1)"


},



service:{


border:"1px solid #ddd",

padding:"15px",

borderRadius:"10px",

marginBottom:"15px"


},



button:{


background:"#16a34a",

color:"white",

border:"none",

padding:"12px 20px",

borderRadius:"10px",

cursor:"pointer"


}



};



export default JobDetails;