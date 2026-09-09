import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase/client";


function JobDetails(){

const {id}=useParams();


const [job,setJob]=useState(null);

const [technicians,setTechnicians]=useState([]);

const [serviceTechnicians,setServiceTechnicians]=useState([]);

const [editingService,setEditingService]=useState(null);

const [selectedTechs,setSelectedTechs]=useState([]);

const [payments,setPayments]=useState([]);


// PAYMENT

const [amount,setAmount]=useState("");

const [method,setMethod]=useState("Cash");

const [notes,setNotes]=useState("");

const [editingPayment,setEditingPayment]=useState(null);




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

async function loadTechnicians(){

const {data,error}=await supabase

.from("technicians")

.select("*")

.eq("active",true);


console.log("TECHNICIANS:",data);


if(error){

console.log(error);

return;

}


setTechnicians(data || []);

}



// LOAD TECHNICIANS ASSIGNED TO SERVICES

async function loadServiceTechnicians(){

const {data,error}=await supabase

.from("service_technicians")

.select(`

id,

commission,

technicians(
 name
),

job_services(
 service_name,
 job_id
)

`)

.eq(
"job_services.job_id",
Number(id)
);



if(error){

console.log(error);

return;

}


setServiceTechnicians(data || []);

}

function startEditTechnicians(service){

const current =
serviceTechnicians
.filter(
t=>t.job_services?.service_name === service
)
.map(t=>({

id:t.technicians.id,
commission:t.commission

}));


setSelectedTechs(current);

setEditingService(service);

}

async function saveTechnicians(service){

// remove old technicians for this service

const {data:jobService}=await supabase

.from("job_services")

.select("id")

.eq("job_id",id)

.eq("service_name",service)

.single();



if(!jobService){

alert("Service not found");

return;

}


// delete old assignments

await supabase

.from("service_technicians")

.delete()

.eq(
"service_id",
jobService.id
);



// insert new assignments

const rows = selectedTechs.map(t=>({

service_id:jobService.id,

technician_id:t.id,

commission:Number(t.commission || 0)

}));



if(rows.length){

const {error}=await supabase

.from("service_technicians")

.insert(rows);



if(error){

alert(error.message);

return;

}

}


await loadServiceTechnicians();


setEditingService(null);


alert("Technicians Updated");

}

// LOAD PAYMENTS

async function loadPayments(){

const {data,error}=await supabase

.from("payments")

.select("*")

.eq(
"job_id",
id
)

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





useEffect(() => {
  loadJob();
  loadTechnicians();
  loadServiceTechnicians();
  loadPayments();
}, [id]);


// ADD PAYMENT
async function updateJobPaymentSummary() {
  // Get the current job from database
  const { data: currentJob, error: jobError } = await supabase
    .from("jobs")
    .select("price, discount")
    .eq("id", Number(id))
    .single();

  if (jobError) {
    console.error(
      "LOAD JOB FOR PAYMENT SUMMARY ERROR:",
      jobError
    );
    return;
  }

  // Get all payments
  const { data: paymentData, error: paymentError } =
    await supabase
      .from("payments")
      .select("amount")
      .eq("job_id", Number(id));

  if (paymentError) {
    console.error(
      "LOAD PAYMENTS FOR PAYMENT SUMMARY ERROR:",
      paymentError
    );
    return;
  }

  // Calculate total paid
  const totalPaid = (paymentData || []).reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  const totalPrice = Number(currentJob.price || 0);
  const discount = Number(currentJob.discount || 0);

  const finalTotal = Math.max(
    totalPrice - discount,
    0
  );

  const balance = finalTotal - totalPaid;

  console.log("========== JOB PAYMENT UPDATE ==========");
  console.log("JOB ID:", id);
  console.log("TOTAL:", totalPrice);
  console.log("DISCOUNT:", discount);
  console.log("TOTAL PAID:", totalPaid);
  console.log("BALANCE:", balance);
  console.log("=========================================");

  // Update jobs table
  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      deposit: totalPaid,
      balance: balance
    })
    .eq("id", Number(id));

  if (updateError) {
    console.error(
      "UPDATE JOB BALANCE ERROR:",
      updateError
    );

    alert(
      "Payment changed, but job balance could not be updated:\n\n" +
        updateError.message
    );

    return;
  }

  // Update React state
  setJob((prev) => ({
    ...prev,
    deposit: totalPaid,
    balance: balance
  }));

  console.log("JOB PAYMENT SUMMARY UPDATED");
}

async function savePayment() {
  if (!amount || Number(amount) <= 0) {
    alert("Enter payment amount");
    return;
  }

  const { error } = await supabase
    .from("payments")
    .insert([
      {
        job_id: Number(id),
        amount: Number(amount),
        payment_method: method,
        payment_date: new Date().toISOString(),
        notes: notes
      }
    ]);

  if (error) {
    console.error("SAVE PAYMENT ERROR:", error);
    alert(error.message);
    return;
  }

  clearPaymentForm();

  await loadPayments();

  await updateJobPaymentSummary();

  alert("Payment added and job updated!");
}




function clearPaymentForm(){

setAmount("");

setMethod("Cash");

setNotes("");

setEditingPayment(null);

}





// DELETE PAYMENT

async function deletePayment(paymentId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this payment?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) {
    console.error(
      "DELETE PAYMENT ERROR:",
      error
    );

    alert(
      "Could not delete payment:\n\n" +
      error.message
    );

    return;
  }

  await loadPayments();

  await updateJobPaymentSummary();

  alert("Payment deleted and job updated!");
}

 
// EDIT PAYMENT

function startEditPayment(payment){

setEditingPayment(payment);

setAmount(payment.amount);

setMethod(payment.payment_method);

setNotes(payment.notes || "");

}




async function updatePayment() {
  if (!editingPayment) return;

  if (!amount || Number(amount) <= 0) {
    alert("Enter payment amount");
    return;
  }

  const { error } = await supabase
    .from("payments")
    .update({
      amount: Number(amount),
      payment_method: method,
      notes: notes
    })
    .eq("id", editingPayment.id);

  if (error) {
    console.error("UPDATE PAYMENT ERROR:", error);
    alert(error.message);
    return;
  }

  clearPaymentForm();

  await loadPayments();

  // IMPORTANT:
  // Recalculate deposit and balance in jobs table
  await updateJobPaymentSummary();

  alert("Payment updated and job balance updated!");
}

if(!job){

return (

<h1>
Loading...
</h1>

);

}



const totalPaid = payments.reduce(
  (sum, payment) =>
    sum + Number(payment.amount || 0),
  0
);

const totalPrice = Number(job.price || 0);
const discount = Number(job.discount || 0);

const finalTotal = Math.max(
  totalPrice - discount,
  0
);

const balance = finalTotal - totalPaid;


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

job.services?.map(service=>{


const serviceTechs =

serviceTechnicians.filter(

item =>

item.job_services?.service_name === service

);



return (


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

<h4>Select Technicians</h4>

{
technicians.map(person=>{

const selected =
selectedTechs.find(
t=>t.id===person.id
);


return (

<div key={person.id}>

<label>

<input

type="checkbox"

checked={!!selected}

onChange={(e)=>{


if(e.target.checked){

setSelectedTechs([

...selectedTechs,

{
id:person.id,
commission:0
}

]);

}
else{

setSelectedTechs(

selectedTechs.filter(

t=>t.id!==person.id

)

);

}


}}

/>

{" "}

{person.name}

</label>


{

selected &&

<input

type="number"

placeholder="Commission"

value={selected.commission}

onChange={(e)=>{


setSelectedTechs(

selectedTechs.map(t=>

t.id===person.id

?

{
...t,
commission:Number(e.target.value)
}

:

t

)

);


}}

/>

}


</div>

)

})

}


<br/>

<button

onClick={()=>saveTechnicians(service)}

>

Save Technicians

</button>


</div>


)

:

(

<div>


{

serviceTechs.length > 0 ?

serviceTechs.map(tech=>(

<div key={tech.id}>

<p>
👷 {tech.technicians?.name}
</p>

<p>
Commission:
QAR {tech.commission || 0}
</p>

</div>

))

:

<p>
No technician assigned
</p>

}


<button

onClick={()=>startEditTechnicians(service)}

>

✏️ Edit Technicians

</button>


</div>

)

}





</div>


);


})

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

<strong>Date:</strong>

{" "}

{new Date(payment.payment_date).toLocaleDateString()}

</p>



<p>

<strong>Amount:</strong>

QAR {payment.amount}

</p>



<p>

<strong>Method:</strong>

{payment.payment_method}

</p>




{

payment.notes &&


<p>

<strong>Notes:</strong>

{payment.notes}

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
  onClick={() => deletePayment(payment.id)}
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




<br/>
<br/>




<Link to={`/invoice/${job.id}`}>

<button
style={styles.invoiceButton}
>
🧾 Invoice
</button>

</Link>


<Link to={`/edit-job/${job.id}`}>

<button>
✏️ Edit Job
</button>

</Link>



</div>

</div>

);


}




const styles = {
  page: {
    padding: "30px",
    background: "var(--bg)",
    minHeight: "100vh",
    color: "#1e293b",
  },

  card: {
    background: "var(--card, #ffffff)",
    padding: "30px",
    borderRadius: "18px",
    maxWidth: "700px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },

  service: {
    border: "1px solid #e2e8f0",
    padding: "18px",
    borderRadius: "12px",
    marginBottom: "15px",
    background: "#f8fafc",
  },

  paymentBox: {
    border: "1px solid #e2e8f0",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "12px",
    background: "#f8fafc",
  },

  button: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "14px",
    fontWeight: "700",
  },

  editButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "9px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    marginRight: "10px",
    fontWeight: "600",
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "9px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  cancelButton: {
    background: "#64748b",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    marginLeft: "10px",
    fontWeight: "600",
  },

  invoiceButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
  },
};




export default JobDetails;