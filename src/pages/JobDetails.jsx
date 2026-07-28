import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase/client";


function JobDetails(){


const {id}=useParams();


const [job,setJob]=useState(null);

const [technicians,setTechnicians]=useState([]);

const [payments,setPayments]=useState([]);



// PAYMENT

const [amount,setAmount]=useState("");

const [method,setMethod]=useState("Cash");

const [notes,setNotes]=useState("");

const [editingPayment,setEditingPayment]=useState(null);
// TECHNICIAN EDIT

const [editingService,setEditingService]=useState(null);

const [editTechnicians,setEditTechnicians]=useState([]);



// LOAD JOB

async function loadJob(){


const {data,error}=await supabase

.from("jobs")

.select("*")

.eq("id", Number(id))

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


setTechnicians(data || []);


}




// LOAD PAYMENTS

async function loadPayments(){

const {data,error}=await supabase
.from("payments")
.select("*")
.eq("job_id",Number(id))
.order("payment_date",{ascending:false});

console.log("PAYMENTS:", data);
console.log("PAYMENT ERROR:", error);

if(error){
console.log(error);
return;
}

setPayments(data || []);

}




useEffect(()=>{


loadJob();

loadTechnicians();

loadPayments();


},[]);


// DELETE PAYMENT

async function deletePayment(paymentID){

const confirmDelete = window.confirm(
"Delete this payment?"
);


if(!confirmDelete){

return;

}


const {error}=await supabase

.from("payments")

.delete()

.eq(
"id",
paymentID
);



if(error){

alert(error.message);

return;

}



loadPayments();


alert("Payment Deleted");


}



// ===============================
// START EDIT TECHNICIANS
// ===============================

function startEditTechnicians(service){

setEditingService(service);


setEditTechnicians(

job.serviceDetails?.[service]?.technicians || []

);

}



async function saveTechnicians(service){

const newDetails = {

...(job.serviceDetails || {}),


[service]:{

...(job.serviceDetails?.[service] || {}),

technicians:editTechnicians

}

};



const {error}=await supabase

.from("jobs")

.update({

serviceDetails:newDetails

})

.eq("id", Number(id));



if(error){

alert(error.message);

return;

}



setJob({

...job,

serviceDetails:newDetails

});


setEditingService(null);

await loadJob();

alert("Technicians Updated");


}

// GET TECHNICIAN NAME

function getTechnicianName(id){

const tech = technicians.find(

t=>t.id===id

);


return tech?.name || "Unknown";


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
 payment_date:new Date().toISOString(),
 notes:notes
}

]);



if(error){

alert(error.message);

return;

}



clearPaymentForm();

await loadPayments();

alert("Payment Added");


}





function clearPaymentForm(){


setAmount("");

setMethod("Cash");

setNotes("");

setEditingPayment(null);


}




// START EDIT

function startEditPayment(payment){


setEditingPayment(payment);

setAmount(payment.amount);

setMethod(payment.payment_method);

setNotes(payment.notes || "");


}
// UPDATE PAYMENT

async function updatePayment(){


const {error}=await supabase

.from("payments")

.update({

amount:Number(amount),

payment_method:method,

notes:notes

})

.eq(
"id",
editingPayment.id
);



if(error){

alert(error.message);

return;

}



clearPaymentForm();

await loadPayments();


alert("Payment Updated");


}


if(!job){


return(

<h1>
Loading...
</h1>

);


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
<strong>Source:</strong> {job.source}
</p>





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
Price:
QAR {job.serviceDetails?.[service]?.price || 0}
</p>


<p>
Discount:
QAR {job.serviceDetails?.[service]?.discount || 0}
</p>



<h4>
Technicians
</h4>


{
editingService === service ? (

<div>


{
technicians.map(person=>(


<label
key={person.id}
style={{
display:"block",
marginBottom:"5px"
}}
>


<input

type="checkbox"


checked={

editTechnicians.includes(person.id)

}


onChange={(e)=>{


if(e.target.checked){


setEditTechnicians([

...editTechnicians,

person.id

]);


}

else{


setEditTechnicians(

editTechnicians.filter(

x=>x!==person.id

)

);


}


}}


/>


{" "}

{person.name}


</label>


))

}


<br/>


<button

style={styles.button}

onClick={()=>saveTechnicians(service)}

>

Save Technicians

</button>



<button

style={styles.cancelButton}

onClick={()=>setEditingService(null)}

>

Cancel

</button>


</div>


)

:

(

<div>


{

job.serviceDetails?.[service]?.technicians?.length ?


job.serviceDetails[service].technicians.map(id=>(


<p key={id}>

👷 {getTechnicianName(id)}

</p>


))


:

<p>
No technician assigned
</p>


}



<button

style={styles.editButton}

onClick={()=>startEditTechnicians(service)}

>

✏️ Edit Technicians

</button>


</div>

)

}



</div>


))


}






<h2>
Payment Summary
</h2>


<p>
Total:
QAR {job.price}
</p>


<p>
Discount:
QAR {job.discount}
</p>


<p>
Paid:
QAR {totalPaid}
</p>


<h2>
Balance:
QAR {balance}
</h2>


<p>

Status:

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



<hr/>


<h2>
Payment History
</h2>
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
<strong>Date:</strong> {new Date(payment.payment_date).toLocaleDateString()}
</p>


<p>
<strong>Amount:</strong> QAR {payment.amount}
</p>


<p>
<strong>Method:</strong> {payment.payment_method}
</p>


{
payment.notes &&

<p>
<strong>Notes:</strong> {payment.notes}
</p>

}



<button

style={styles.editButton}

onClick={()=>startEditPayment(payment)}

>

✏️ Edit

</button>



<button

style={styles.deleteButton}

onClick={()=>deletePayment(payment.id)}

>

🗑 Delete

</button>



</div>


))

}





<hr/>


<h2>

{
editingPayment

?

"Edit Payment"

:

"Add Payment"

}

</h2>



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

style={styles.button}

onClick={

editingPayment

?

updatePayment

:

savePayment

}

>

{

editingPayment

?

"Update Payment"

:

"Add Payment"

}

</button>




{

editingPayment &&


<button

style={styles.cancelButton}

onClick={clearPaymentForm}

>

Cancel

</button>


}





<br/><br/>




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



editButton:{


background:"#f59e0b",

color:"white",

border:"none",

padding:"8px 15px",

borderRadius:"8px",

cursor:"pointer",

marginRight:"10px"


},



deleteButton:{


background:"#dc2626",

color:"white",

border:"none",

padding:"8px 15px",

borderRadius:"8px",

cursor:"pointer"


},



cancelButton:{


background:"#6b7280",

color:"white",

border:"none",

padding:"12px 20px",

borderRadius:"10px",

cursor:"pointer",

marginLeft:"10px"


},



invoiceButton:{


background:"#2563eb",

color:"white",

border:"none",

padding:"12px 20px",

borderRadius:"10px",

cursor:"pointer"


}


};



export default JobDetails;