import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";


function Reports(){

const [jobs,setJobs] = useState([]);
const [payments,setPayments] = useState([]);


useEffect(()=>{

loadReports();

},[]);



async function loadReports(){

const {data:jobData,error:jobError} =
await supabase
.from("jobs")
.select("*");


const {data:paymentData,error:paymentError} =
await supabase
.from("payments")
.select("*");

console.log("REPORT JOBS:", jobData);
console.log("REPORT PAYMENTS:", paymentData);

console.log("JOB ERROR:", jobError);
console.log("PAYMENT ERROR:", paymentError);
if(jobError){
console.log(jobError);
}

if(paymentError){
console.log(paymentError);
}


setJobs(jobData || []);
setPayments(paymentData || []);

}



const netSales = jobs.reduce(
(sum,job)=>
sum + Number(job.price || 0) - Number(job.discount || 0),
0
);



const paid = payments.reduce(
(sum,payment)=>
sum + Number(payment.amount || 0),
0
);



const balance = netSales - paid;

const teyseerSources = [
  "Teyseer Motors",
  "Teyseer Motors - Bahaa",
  "Teyseer Motors - Salah"
];


const teyseerJobs = jobs.filter(job =>
  teyseerSources.includes(job.source)
);


const customerJobs = jobs.filter(job =>
  !teyseerSources.includes(job.source)
);


const teyseerSales = teyseerJobs.reduce(
  (sum, job) =>
    sum + Number(job.price || 0) - Number(job.discount || 0),
  0
);


const customerSales = customerJobs.reduce(
  (sum, job) =>
    sum + Number(job.price || 0) - Number(job.discount || 0),
  0
);


const teyseerIds = teyseerJobs.map(job => job.id);

const customerIds = customerJobs.map(job => job.id);


const teyseerPaid = payments
.filter(payment =>
  teyseerIds.includes(payment.job_id)
)
.reduce(
  (sum,payment)=>sum + Number(payment.amount || 0),
  0
);


const customerPaid = payments
.filter(payment =>
  customerIds.includes(payment.job_id)
)
.reduce(
  (sum,payment)=>sum + Number(payment.amount || 0),
  0
);


const teyseerBalance = teyseerSales - teyseerPaid;

const customerBalance = customerSales - customerPaid;

return (

<div style={{
padding:"30px",
background:"#f1f5f9",
minHeight:"100vh"
}}>


<h1>
📊 Financial Reports
</h1>


<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
gap:"20px"
}}>


<div style={cardStyle}>
<h3>
Net Sales
</h3>
<h2>
${netSales}
</h2>
</div>


<div style={cardStyle}>
<h3>
Paid
</h3>
<h2>
${paid}
</h2>
</div>


<div style={cardStyle}>
<h3>
Balance Due
</h3>
<h2>
${balance}
</h2>
</div>


</div>


</div>

);


}



const cardStyle={

background:"white",
padding:"25px",
borderRadius:"18px",
boxShadow:"0 8px 20px rgba(0,0,0,0.08)",
textAlign:"center"

};


export default Reports;