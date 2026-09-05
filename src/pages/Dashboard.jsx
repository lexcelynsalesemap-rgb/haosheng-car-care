import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UserMenu from "../components/UserMenu";
import { supabase } from "../supabase/client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

function Dashboard() {

  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] = useState([]);
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => {

    loadDashboard();

    const jobsChannel = supabase
      .channel("dashboard-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs"
        },
        () => loadJobs()
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("dashboard-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments"
        },
        () => loadPayments()
      )
      .subscribe();

    const servicesChannel = supabase
      .channel("dashboard-services")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_services"
        },
        () => loadJobServices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(servicesChannel);
    };

  }, []);

  async function loadDashboard() {
    await Promise.all([
      loadJobs(),
      loadPayments(),
      loadJobServices()
    ]);
  }

  async function loadJobs() {

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setJobs(data || []);
  }

  async function loadPayments() {

    const { data, error } = await supabase
      .from("payments")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    setPayments(data || []);
  }

  async function loadJobServices() {

    const { data, error } = await supabase
      .from("job_services")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    console.log("ALL JOB SERVICES:", data);
setJobServices(data || []);
  }

  const filteredJobs = jobs.filter(job => {

    if (dateFilter === "All") return true;

    const jobDate = new Date(job.created_at);
    const now = new Date();

    if (dateFilter === "Today") {
      return jobDate.toDateString() === now.toDateString();
    }

    if (dateFilter === "Month") {
      return (
        jobDate.getMonth() === now.getMonth() &&
        jobDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === "Year") {
      return jobDate.getFullYear() === now.getFullYear();
    }

    return true;

  });
    // =============================
  // GENERAL DASHBOARD DATA
  // =============================

  const totalJobs = filteredJobs.length;


  const newJobs =
    filteredJobs.filter(
      job => (job.status || "New") === "New"
    ).length;


  const progressJobs =
    filteredJobs.filter(
      job => job.status === "In Progress"
    ).length;


  const finishedJobs =
    filteredJobs.filter(
      job => job.status === "Finished"
    ).length;


  const deliveredJobs =
    filteredJobs.filter(
      job => job.status === "Delivered"
    ).length;



  // =============================
  // FINANCIAL DATA
  // =============================


  const totalSales =
    filteredJobs.reduce(
      (sum, job) =>
        sum + Number(job.price || 0),
      0
    );


  const totalDiscount =
    filteredJobs.reduce(
      (sum, job) =>
        sum + Number(job.discount || 0),
      0
    );


  const paid =
    payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );


  const netSales =
    totalSales - totalDiscount;


  const balance =
    netSales - paid;



  // =============================
  // SOURCE REPORT
  // =============================


  let teyseerNetSales = 0;
  let salesTeamNetSales = 0;


  const sourceReport = {

    "Teyseer Motors":{
      jobs:0,
      sales:0
    },

    "Salah":{
      jobs:0,
      sales:0
    },

    "Bahaa":{
      jobs:0,
      sales:0
    },

    "Sales Team":{
      jobs:0,
      sales:0
    }

  };

console.table(
  filteredJobs.map(job => ({
    id: job.id,
    customer: job.customer,
    source: job.source
  }))
);

  filteredJobs.forEach(job => {


    const services =
      jobServices.filter(
        service =>
          service.job_id === job.id
      );

console.log("JOB:", job.id, job.customer);
console.log("SERVICES:", services);

    services.forEach(service => {


      const amount =
        Number(service.price || 0);



      const serviceName =
        (
          service.service_name ||
          service.name ||
          ""
        )
        .toLowerCase();



      let reportSource = "Sales Team";



      // DIRECT TEYSEER

      if(job.source === "Teyseer Motors"){

        reportSource = "Teyseer Motors";

      }



      // SALAH

      else if(
        job.source === "Teyseer Motors - Salah"
      ){

        if(
          serviceName.includes("full wtt")
        ){

          reportSource = "Teyseer Motors";

        }
        else{

          reportSource = "Salah";

        }

      }



      // BAHA

      else if(
        job.source === "Teyseer Motors - Bahaa"
      ){

        if(
          serviceName.includes("full wtt")
        ){

          reportSource = "Teyseer Motors";

        }
        else{

          reportSource = "Bahaa";

        }

      }

else if (job.source === "Bahaa") {

  reportSource = "Bahaa";

}

else if (job.source === "Salah") {

  reportSource = "Salah";

}

      if(!sourceReport[reportSource]){

        sourceReport[reportSource] = {
          jobs:0,
          sales:0
        };

      }



      sourceReport[reportSource].jobs += 1;

      sourceReport[reportSource].sales += amount;



      if(reportSource === "Teyseer Motors"){

        teyseerNetSales += amount;

      }
      
      else{

        salesTeamNetSales += amount;

      }


    });


  });



  // =============================
  // PAYMENT SPLIT
  // =============================


  const teyseerPaid = 0;


  const salesTeamPaid =
    payments.reduce(
      (sum,payment)=>
        sum + Number(payment.amount || 0),
      0
    );



  const teyseerBalance =
    teyseerNetSales - teyseerPaid;



  const salesTeamBalance =
    salesTeamNetSales - salesTeamPaid;
   

// =============================
// CHART DATA
// =============================

const statusData = [

  {
    name:"New",
    value:newJobs
  },

  {
    name:"Progress",
    value:progressJobs
  },

  {
    name:"Finished",
    value:finishedJobs
  },

  {
    name:"Delivered",
    value:deliveredJobs
  }

];



const salesData = [

  {
    name:"Sales",
    amount:netSales
  },

  {
    name:"Paid",
    amount:paid
  },

  {
    name:"Due",
    amount:balance
  }

];



const COLORS = [

"#7c3aed",
"#ea580c",
"#16a34a",
"#0891b2"

];





return (

<div style={styles.page}>


<div style={styles.header}>


<div>

<h1>
🚗 Haosheng Car Care
</h1>


<p>
Workshop Management System
</p>


</div>



<div
style={{
display:"flex",
gap:"15px",
alignItems:"center"
}}
>


<UserMenu/>


<Link to="/new-job">

<button style={styles.newButton}>
+ New Job
</button>

</Link>



<Link to="/technician-earnings">

<button>
👷 Technician Earnings
</button>

</Link>


</div>


</div>





<div style={{marginBottom:"25px"}}>


<select

value={dateFilter}

onChange={(e)=>
setDateFilter(e.target.value)
}

style={{
padding:"10px",
borderRadius:"10px",
border:"1px solid #ddd",
fontSize:"16px"
}}

>


<option value="All">
All Time
</option>


<option value="Today">
Today
</option>


<option value="Month">
This Month
</option>


<option value="Year">
This Year
</option>


</select>


</div>





<div style={styles.cards}>


<Card
title="Total Jobs"
value={totalJobs}
icon="🚗"
/>



<Card
title="New"
value={newJobs}
icon="🆕"
status="New"
/>



<Card
title="In Progress"
value={progressJobs}
icon="🔧"
status="In Progress"
/>



<Card
title="Finished"
value={finishedJobs}
icon="✅"
status="Finished"
/>



<Card
title="Delivered"
value={deliveredJobs}
icon="🚚"
status="Delivered"
/>



<Card
title="Net Sales"
value={`QAR ${netSales}`}
icon="💰"
/>



<Card
title="Teyseer Sales"
value={`QAR ${teyseerNetSales}`}
icon="🏢"
/>



<Card
title="Sales Team Sales"
value={`QAR ${salesTeamNetSales}`}
icon="👥"
/>



<Card
title="Teyseer Paid"
value={`QAR ${teyseerPaid}`}
icon="🏢💳"
/>



<Card
title="Teyseer Balance"
value={`QAR ${teyseerBalance}`}
icon="🏢⚠️"
/>



<Card
title="Sales Team Paid"
value={`QAR ${salesTeamPaid}`}
icon="👥💳"
/>



<Card
title="Sales Team Balance"
value={`QAR ${salesTeamBalance}`}
icon="👥⚠️"
/>



<Card
title="Paid"
value={`QAR ${paid}`}
icon="💳"
/>



<Card
title="Balance Due"
value={`QAR ${balance}`}
icon="⚠️"
/>


</div>
<h2>
Recent Jobs
</h2>



<div style={styles.tableBox}>


<table style={styles.table}>


<thead>

<tr>

<th>
Customer
</th>


<th>
Vehicle
</th>


<th>
Status
</th>


<th>
Price
</th>


</tr>


</thead>




<tbody>


{
filteredJobs
.slice(-5)
.reverse()
.map(job=>(


<tr key={job.id}>


<td>
{job.customer || "Unknown"}
</td>


<td>
{job.carModel || "-"}
</td>


<td>

<span style={styles.status}>

{job.status || "New"}

</span>

</td>


<td>

QAR {job.price || 0}

</td>


</tr>


))
}



</tbody>


</table>


</div>





<h2>
Statistics
</h2>





<div style={styles.charts}>


<div style={styles.chartBox}>


<h3>
Job Status
</h3>




<ResponsiveContainer
width="100%"
height={250}
>


<PieChart>


<Pie

data={statusData}

dataKey="value"

nameKey="name"

outerRadius={90}

>


{
statusData.map(
(entry,index)=>(


<Cell

key={index}

fill={COLORS[index]}

/>


))
}


</Pie>


</PieChart>


</ResponsiveContainer>


</div>





<div style={styles.chartBox}>


<h3>
Financial Overview
</h3>




<ResponsiveContainer
width="100%"
height={250}
>


<BarChart

data={salesData}

>


<XAxis
dataKey="name"
/>


<YAxis />


<Tooltip />


<Bar

dataKey="amount"

fill="#2563eb"

/>


</BarChart>


</ResponsiveContainer>


</div>



</div>
<h2>
Customer Sources
</h2>




<div style={styles.recent}>


{
Object.entries(sourceReport).map(
([name,data])=>(


<div

key={name}

style={styles.recentCard}

>


<h3>
{name}
</h3>


<h2>
{data.jobs}
</h2>


<p>
Jobs
</p>


<h3>
Net Sales: QAR {data.sales}
</h3>



</div>


))
}


</div>







<h2>
Quick Actions
</h2>





<div style={styles.actions}>


<Link

to="/new-job"

style={styles.actionCard}

>


<div>
➕
</div>


<h3>
New Job
</h3>


<p>
Create service order
</p>


</Link>







<Link

to="/jobs"

style={styles.actionCard}

>


<div>
📋
</div>


<h3>
Jobs
</h3>


<p>
Manage repairs
</p>


</Link>







<Link
  to="/jobs"
  style={styles.actionCard}
>
  <div>
    🧾
  </div>

  <h3>
    Invoice
  </h3>

  <p>
    Select a car to create invoice
  </p>
</Link>







<Link

to="/settings"

style={styles.actionCard}

>


<div>
⚙️
</div>


<h3>
Settings
</h3>


<p>
System setup
</p>


</Link>



</div>








<Link

to="/reports"

style={styles.actionCard}

>


<div>
📊
</div>


<h3>
Reports
</h3>


<p>
Financial overview
</p>


</Link>





</div>

);

}
function Card({title,value,status,icon}){


const colors={

"Total Jobs":"#2563eb",

"New":"#7c3aed",

"In Progress":"#ea580c",

"Finished":"#16a34a",

"Delivered":"#0891b2",

"Net Sales":"#ca8a04",

"Teyseer Sales":"#9333ea",

"Sales Team Sales":"#0284c7",

"Teyseer Paid":"#7c3aed",

"Teyseer Balance":"#dc2626",

"Sales Team Paid":"#16a34a",

"Sales Team Balance":"#ea580c",

"Paid":"#15803d",

"Balance Due":"#dc2626"

};



const content = (

<div

style={{

...styles.card,

borderTop:
`5px solid ${colors[title] || "#2563eb"}`

}}

>


<div style={styles.icon}>

{icon}

</div>


<h3>
{title}
</h3>


<h2>
{value}
</h2>


</div>

);



if(status){


return (

<Link

to={`/jobs?status=${status}`}

style={{
textDecoration:"none"
}}

>

{content}

</Link>

);


}


return content;


}







const styles = {



page:{

padding:"30px",

background:"#f1f5f9",

minHeight:"100vh",

color:"#0f172a"

},




header:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

marginBottom:"30px",

flexWrap:"wrap"

},




cards:{

display:"grid",

gridTemplateColumns:
"repeat(auto-fit,minmax(220px,1fr))",

gap:"20px",

marginBottom:"40px"

},




card:{

background:"white",

padding:"25px",

borderRadius:"18px",

textAlign:"center",

boxShadow:
"0 8px 20px rgba(0,0,0,0.08)",

color:"#0f172a"

},




icon:{

fontSize:"35px",

marginBottom:"10px"

},




newButton:{

background:"#dc2626",

color:"white",

border:"none",

padding:"12px 25px",

borderRadius:"10px",

fontSize:"16px",

cursor:"pointer"

},




tableBox:{

background:"white",

borderRadius:"18px",

padding:"20px",

boxShadow:
"0 8px 20px rgba(0,0,0,0.08)",

marginBottom:"40px",

overflowX:"auto"

},




table:{

width:"100%",

borderCollapse:"collapse",

textAlign:"left"

},




status:{

background:"#dcfce7",

color:"#166534",

padding:"6px 12px",

borderRadius:"20px",

fontSize:"14px"

},




charts:{

display:"grid",

gridTemplateColumns:
"repeat(auto-fit,minmax(300px,1fr))",

gap:"20px",

marginBottom:"40px"

},




chartBox:{

background:"white",

padding:"20px",

borderRadius:"18px",

boxShadow:
"0 8px 20px rgba(0,0,0,0.08)"

},




recent:{

display:"grid",

gridTemplateColumns:
"repeat(auto-fit,minmax(250px,1fr))",

gap:"20px",

marginBottom:"40px"

},




recentCard:{

background:"white",

padding:"20px",

borderRadius:"18px",

boxShadow:
"0 8px 20px rgba(0,0,0,0.08)"

},




actions:{

display:"grid",

gridTemplateColumns:
"repeat(auto-fit,minmax(180px,1fr))",

gap:"20px",

marginBottom:"40px"

},




actionCard:{

background:"white",

padding:"25px",

borderRadius:"18px",

textDecoration:"none",

color:"#0f172a",

textAlign:"center",

boxShadow:
"0 8px 20px rgba(0,0,0,0.08)",

display:"block"

}
};




export default Dashboard;