import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase/client";


function JobDetails(){


const {id}=useParams();


const [job,setJob]=useState(null);

const [technicians,setTechnicians]=useState([]);

const [payments,setPayments]=useState([]);


// PAYMENT FORM

const [amount,setAmount]=useState("");

const [method,setMethod]=useState("Cash");

const [notes,setNotes]=useState("");



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




// LOAD PAYMENTS

async function loadPayments(){


const {data,error}=await supabase

.from("payments")

.select("*")

.eq("job_id",id)

.order(
"payment_date",
{
ascending:false
}
);



if(error){

console.log(error);

return;

}



setPayments(data || []);


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



setTechnicians(data || []);


}




// ADD PAYMENT

async function savePayment(){


if(!amount || Number(amount)<=0){

alert("Enter payment amount");

return;

}



const {error}=await supabase

.from("payments")

.insert([

{

job_id:Number(id),

amount:Number(amount),

payment_method:method,

notes:notes

}

]);



if(error){

console.log(error);

alert(error.message);

return;

}



setAmount("");

setMethod("Cash");

setNotes("");



await loadPayments();


alert("Payment Added Successfully");


}




useEffect(()=>{


loadJob();

loadTechnicians();

loadPayments();


},[]);





if(!job){


return (

<h1>
Loading...
</h1>

);


}





function getTechnicianName(id){


const tech=technicians.find(

t=>t.id===id

);



return tech?.name || "Unknown";


}





const totalPaid = payments.reduce(

(sum,payment)=>

sum + Number(payment.amount),

0

);





const balance =

Number(job.price || 0)

-

Number(job.discount || 0)

-

totalPaid;





let paymentStatus="Unpaid";



if(balance<=0){

paymentStatus="Paid";

}

else if(totalPaid>0){

paymentStatus="Partially Paid";

}
return (

<div style={styles.page}>


<h1>
Job Details
</h1>



<div style={styles.card}>


<h2>
Customer Information
</h2>


<p>
<strong>Name:</strong> {job.customer}
</p>


<p>
<strong>Phone:</strong> {job.phone}
</p>


<p>
<strong>Date:</strong> {job.date}
</p>


<p>
<strong>Source:</strong> {job.source || "Not specified"}
</p>



{
job.voucherNumber &&

<p>
<strong>Voucher:</strong> {job.voucherNumber}
</p>

}





<h2>
Vehicle Information
</h2>


<p>
<strong>Model:</strong> {job.carModel}
</p>


<p>
<strong>Type:</strong> {job.carType}
</p>


<p>
<strong>Color:</strong> {job.color}
</p>


<p>
<strong>Chassis:</strong> {job.chassis}
</p>


<p>
<strong>Plate:</strong> {job.plate}
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
<strong>Price:</strong>

QAR {job.serviceDetails?.[service]?.price || 0}

</p>



<p>
<strong>Discount:</strong>

QAR {job.serviceDetails?.[service]?.discount || 0}

</p>



<p>
<strong>Quantity:</strong>

{job.serviceDetails?.[service]?.quantity || 1}

</p>





<h4>
Technicians
</h4>




{

job.serviceDetails?.[service]?.technicians?.length ?


job.serviceDetails[service]
.technicians
.map(techID=>(


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
Payment Summary
</h2>



<p>
<strong>Total:</strong>

QAR {job.price}

</p>




<p>
<strong>Discount:</strong>

QAR {job.discount}

</p>




<p>
<strong>Paid:</strong>

QAR {totalPaid}

</p>



<h2>
Balance:

QAR {balance}
</h2>




<p>

<strong>Status:</strong>

{" "}

{

paymentStatus==="Paid"

?

"🟢 Paid"

:

paymentStatus==="Partially Paid"

?

"🟡 Partially Paid"

:

"🔴 Unpaid"

}

</p>






<hr />



<h3>
Payment History
</h3>




{

payments.length===0 ?


<p>
No payments yet.
</p>


:


payments.map(payment=>(


<div

key={payment.id}

style={styles.paymentBox}

>


<p>

<strong>Date:</strong>

{" "}

{payment.payment_date}

</p>



<p>

<strong>Amount:</strong>

{" "}

QAR {payment.amount}

</p>




<p>

<strong>Method:</strong>

{" "}

{payment.payment_method}

</p>



{

payment.notes &&


<p>

<strong>Notes:</strong>

{" "}

{payment.notes}

</p>


}



</div>


))


}





<hr />



<h3>
Add Payment
</h3>




<input

type="number"

placeholder="Amount"

value={amount}

onChange={(e)=>

setAmount(e.target.value)

}

/>





<select

value={method}

onChange={(e)=>

setMethod(e.target.value)

}

>


<option value="Cash">
Cash
</option>


<option value="Visa">
Visa
</option>


<option value="Mastercard">
Mastercard
</option>


<option value="PayLater">
PayLater
</option>


</select>





<textarea

placeholder="Notes"

value={notes}

onChange={(e)=>

setNotes(e.target.value)

}

/>





<button

onClick={savePayment}

style={styles.button}

>

Add Payment

</button>





<Link to={`/invoice/${job.id}`}>

<button

style={styles.invoiceButton}

>

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




paymentBox:{


border:"1px solid #ddd",

padding:"12px",

borderRadius:"10px",

marginBottom:"10px",

background:"#fafafa"


},




button:{


background:"#16a34a",

color:"white",

border:"none",

padding:"12px 20px",

borderRadius:"10px",

cursor:"pointer",

marginTop:"10px"


},




invoiceButton:{


background:"#2563eb",

color:"white",

border:"none",

padding:"12px 20px",

borderRadius:"10px",

cursor:"pointer",

marginTop:"10px",

marginLeft:"10px"


}



};





export default JobDetails;