import { useState, useEffect } from "react";
import UserMenu from "../components/UserMenu";
import { Link } from "react-router-dom";
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
const [dateFilter, setDateFilter] = useState("All");
useEffect(() => {

  async function loadDashboard(){

    await loadJobs();
    await loadPayments();

  }

  loadDashboard();


  const channel = supabase
    .channel("jobs-changes")
    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"jobs"
      },
      ()=>{
        loadJobs();
      }
    )
    .subscribe();


  const paymentChannel = supabase
    .channel("payments-changes")
    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"payments"
      },
      ()=>{
        loadPayments();
      }
    )
    .subscribe();


  return ()=>{
    supabase.removeChannel(channel);
    supabase.removeChannel(paymentChannel);
  };

},[]);
async function loadJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setJobs(data || []);
}
async function loadPayments(){

  const {data,error}=await supabase
    .from("payments")
    .select("*");

  console.log("DASHBOARD PAYMENTS:", data);
  console.log("DASHBOARD ERROR:", error);

  setPayments(data || []);

}
const filteredJobs = jobs.filter(job => {

  if(dateFilter === "All"){
    return true;
  }

  const jobDate = new Date(job.created_at);
  const now = new Date();


  if(dateFilter === "Today"){
    return (
      jobDate.toDateString() === now.toDateString()
    );
  }


  if(dateFilter === "Month"){
    return (
      jobDate.getMonth() === now.getMonth() &&
      jobDate.getFullYear() === now.getFullYear()
    );
  }


  if(dateFilter === "Year"){
    return (
      jobDate.getFullYear() === now.getFullYear()
    );
  }


  return true;

});
  const totalJobs = filteredJobs.length;


  const newJobs =
    filteredJobs.filter(job => (job.status || "New") === "New").length;


  const progressJobs =
    filteredJobs.filter(job => job.status === "In Progress").length;


  const finishedJobs =
    filteredJobs.filter(job => job.status === "Finished").length;


  const deliveredJobs =
    filteredJobs.filter(job => job.status === "Delivered").length;


  const totalSales = filteredJobs.reduce(
  (sum, job) => sum + Number(job.price || 0),
  0
);

const totalDiscount = filteredJobs.reduce(
  (sum, job) => sum + Number(job.discount || 0),
  0
);

const paid = payments.reduce(
  (sum, payment) => sum + Number(payment.amount || 0),
  0
);

const netSales = totalSales - totalDiscount;

const balance = netSales - paid;
const sourceReport = {

  "Teyseer Motors": filteredJobs.filter(
    job => job.source === "Teyseer Motors"
  ).length,

  "Teyseer Motors - Bahaa": filteredJobs.filter(
    job => job.source === "Teyseer Motors - Bahaa"
  ).length,

  "Teyseer Motors - Salah": filteredJobs.filter(
    job => job.source === "Teyseer Motors - Salah"
  ).length,

  "Bahaa": filteredJobs.filter(
    job => job.source === "Bahaa"
  ).length,

  "Salah": filteredJobs.filter(
    job => job.source === "Salah"
  ).length,

  "Walk-in": filteredJobs.filter(
    job => job.source === "Walk-in"
  ).length,

  "Other":filteredJobs.filter(
    job => job.source === "Other"
  ).length


};
const statusData = [
  {
    name: "New",
    value: newJobs
  },
  {
    name: "Progress",
    value: progressJobs
  },
  {
    name: "Finished",
    value: finishedJobs
  },
  {
    name: "Delivered",
    value: deliveredJobs
  }
];


const salesData = [
  {
    name: "Sales",
    amount: totalSales
  },
  {
    name: "Paid",
    amount: paid
  },
  {
    name: "Due",
    amount: balance
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
<div style={{marginBottom:"25px"}}>

<select
value={dateFilter}
onChange={(e)=>setDateFilter(e.target.value)}
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
      <div>
        <h1>
          🚗 Haosheng Car Care
        </h1>

        <p>
          Workshop Management System
        </p>
      </div>


      <div style={{display:"flex", gap:"15px", alignItems:"center"}}>

        <UserMenu />

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
  value={`$${netSales}`}
  icon="💰"
/>

<Card 
  title="Paid"
  value={`$${paid}`}
  icon="💳"
/>

<Card 
  title="Balance Due"
  value={`$${balance}`}
  icon="⚠️"
/>
      </div>
<h2>Recent Jobs</h2>

<div style={styles.tableBox}>

  <table style={styles.table}>

    <thead>
      <tr>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Status</th>
        <th>Price</th>
      </tr>
    </thead>

    <tbody>

      {filteredJobs.slice(-5).reverse().map(job => (

        <tr key={job.id}>

          <td>
            {job.customer}
          </td>

          <td>
            {job.carModel}
          </td>

          <td>
            <span style={styles.status}>
              {job.status || "New"}
            </span>
          </td>

          <td>
            ${job.price || 0}
          </td>

        </tr>

      ))}

    </tbody>

  </table>

</div>
<h2>Statistics</h2>

<div style={styles.charts}>

<div style={styles.chartBox}>

<h3>Job Status</h3>

<ResponsiveContainer width="100%" height={250}>

<PieChart>

<Pie
data={statusData}
dataKey="value"
nameKey="name"
outerRadius={90}
>

{statusData.map((entry,index)=>(
<Cell
key={index}
fill={COLORS[index]}
/>
))}

</Pie>

</PieChart>

</ResponsiveContainer>

</div>


<div style={styles.chartBox}>

<h3>Financial Overview</h3>

<ResponsiveContainer width="100%" height={250}>

<BarChart data={salesData}>

<XAxis dataKey="name"/>

<YAxis/>

<Tooltip/>

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

  {Object.entries(sourceReport).map(([name, count]) => (

    <div
      key={name}
      style={styles.recentCard}
    >

      <h3>
        {name}
      </h3>

      <h2>
        {count}
      </h2>

      <p>
        Jobs
      </p>

    </div>

  ))}

</div>
<h2>Quick Actions</h2>

<div style={styles.actions}>

  <Link to="/new-job" style={styles.actionCard}>
    <div>➕</div>
    <h3>New Job</h3>
    <p>Create service order</p>
  </Link>

  <Link to="/jobs" style={styles.actionCard}>
    <div>📋</div>
    <h3>Jobs</h3>
    <p>Manage repairs</p>
  </Link>

  <Link to="/invoice" style={styles.actionCard}>
    <div>🧾</div>
    <h3>Invoice</h3>
    <p>Create invoice</p>
  </Link>

  <Link to="/settings" style={styles.actionCard}>
  <div>⚙️</div>
  <h3>Settings</h3>
  <p>System setup</p>
</Link>

</div>

    </div>

  );

}

function Card({ title, value, status, icon }) {

  const colors = {
    "Total Jobs": "#2563eb",
    "New": "#7c3aed",
    "In Progress": "#ea580c",
    "Finished": "#16a34a",
    "Delivered": "#0891b2",
    "Total Sales": "#ca8a04",
    "Paid": "#15803d",
    "Balance Due": "#dc2626"
  };


  const cardContent = (

    <div
      style={{
        ...styles.card,
        borderTop: `5px solid ${colors[title] || "#2563eb"}`
      }}
    >

      <div style={styles.icon}>
        {icon}
      </div>

      <h3>{title}</h3>

      <h2>
        {value}
      </h2>

    </div>

  );


  if (status) {

    return (

      <Link
        to={`/jobs?status=${status}`}
        style={{textDecoration:"none"}}
      >
        {cardContent}
      </Link>

    );


  }


  return cardContent;

}

 






const styles = {
  page: {
    padding: "30px",
    background: "#f1f5f9",
    minHeight: "100vh",
    color: "#0f172a"
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "20px",
    marginBottom: "40px"
  },

  card: {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  textAlign: "center",
  border: "none",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  color: "#0f172a",
  cursor: "pointer",
  transition: "0.3s"
},

  buttons: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap"
  },

  recent: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px",
    marginBottom: "40px"
  },

  recentCard: {
    background: "white",
    padding: "20px",
    borderRadius: "18px",
    border: "none",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },
  header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px",
  flexWrap: "wrap"
},

newButton: {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "12px 25px",
  borderRadius: "10px",
  fontSize: "16px",
  cursor: "pointer"
},
tableBox: {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  marginBottom: "40px",
  overflowX: "auto"
},

table: {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left"
},

status: {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "14px"
},
actionCard: {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  textDecoration: "none",
  color: "#0f172a",
  textAlign: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  transition: "0.3s"
},
icon: {
  fontSize: "35px",
  marginBottom: "10px"
},
actions: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "20px",
  marginBottom: "40px"
},
};


export default Dashboard;