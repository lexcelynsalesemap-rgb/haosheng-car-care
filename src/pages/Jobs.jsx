import { useState } from "react";
import { Link } from "react-router-dom";


function Jobs() {


  const [jobs, setJobs] = useState(
    JSON.parse(localStorage.getItem("jobs")) || []
  );


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");



  function updateStatus(id, newStatus) {

    const updatedJobs = jobs.map(job =>
      job.id === id
        ? { ...job, status: newStatus }
        : job
    );


    setJobs(updatedJobs);


    localStorage.setItem(
      "jobs",
      JSON.stringify(updatedJobs)
    );

  }



  const filteredJobs = jobs.filter(job => {

  const text = search.toLowerCase();

  const matchesSearch =
    job.customer?.toLowerCase().includes(text) ||
    job.phone?.toLowerCase().includes(text) ||
    job.plate?.toLowerCase().includes(text) ||
    job.carModel?.toLowerCase().includes(text);


  const matchesStatus =
    statusFilter === "All" ||
    (job.status || "New") === statusFilter;


  return matchesSearch && matchesStatus;

});

   



  return (

    <div style={styles.page}>


      <h1>
        Jobs
      </h1>



      <input

        style={styles.search}

        placeholder="Search customer, phone, plate, car..."

        value={search}

        onChange={(e)=>setSearch(e.target.value)}

      />



      {
        filteredJobs.length === 0 ? (

          <p>
            No jobs found
          </p>

        ) : (


          filteredJobs.map(job => (


            <div
  key={job.id}
  style={styles.jobCard}
>


              <div style={styles.jobHeader}>

 <Link to={`/job-details/${job.id}`}>

<h2>
  👤 {job.customer}
</h2>

</Link>

  <span
    style={{
      ...styles.badge,
      background:
        job.status === "Finished"
          ? "#16a34a"
          : job.status === "Delivered"
          ? "#0891b2"
          : job.status === "In Progress"
          ? "#ea580c"
          : "#2563eb"
    }}
  >
    {job.status || "New"}
  </span>

</div>


              <p>
                Phone: {job.phone}
              </p>


              <p>
                Vehicle: {job.carModel}
              </p>


              <p>
                Plate: {job.plate}
              </p>


              <p>
                Services: {job.services?.join(", ")}
              </p>


              <p style={styles.money}>
  💰 Balance: ${job.balance || 0}
</p>



              <p>
  Status:
  {job.status || "New"}
</p>


<p>
  Source:
  {job.source || "Not specified"}
</p>


{
  job.voucherNumber && (

    <p>
      Voucher No:
      {job.voucherNumber}
    </p>

  )
}

              <select

  value={job.status || "New"}

  onChange={(e)=>
    updateStatus(job.id, e.target.value)
  }

  style={{
    ...styles.status,
    background:
      job.status === "Finished"
        ? "#39d16e"
        : job.status === "Delivered"
        ? "#cbe922"
        : job.status === "In Progress"
        ? "#b87ee7"
        : "#2890e6"
  }}

>
              

                <option value="New">
                  New
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Finished">
                  Finished
                </option>

                <option value="Delivered">
                  Delivered
                </option>

              </select>



              <br />
              <br />



              <Link to={`/edit-job/${job.id}`}>
  <button style={styles.editButton}>
  ✏️ Edit
</button>
</Link>


{" "}


<Link to={`/invoice/${job.id}`}>
  <button style={styles.invoiceButton}>
  🧾 Invoice
</button>
</Link>


            </div>


          ))

        )

      }


    </div>

  );

}



const styles = {


page:{
  padding:"30px",
  background:"var(--bg)",
  minHeight:"100vh"
},


search:{
  padding:"12px",
  width:"300px",
  marginBottom:"20px",
  border:"1px solid var(--border)",
  borderRadius:"8px"
},


card:{
  background:"white",
  padding:"20px",
  marginBottom:"15px",
  borderRadius:"12px",
  boxShadow:"var(--shadow)"
},


status:{
  padding:"8px",
  borderRadius:"8px",
  border:"1px solid var(--border)",
  background:"white"
},
jobCard:{
  background:"white",
  padding:"25px",
  marginBottom:"20px",
  borderRadius:"18px",
  boxShadow:"0 8px 20px rgba(0,0,0,0.08)"
},

editButton:{
  background:"#2563eb",
  color:"white",
  border:"none",
  padding:"10px 18px",
  borderRadius:"10px",
  cursor:"pointer",
  marginRight:"10px"
},

invoiceButton:{
  background:"#16a34a",
  color:"white",
  border:"none",
  padding:"10px 18px",
  borderRadius:"10px",
  cursor:"pointer"
},
jobHeader:{
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:"15px"
},

badge:{
  color:"white",
  padding:"8px 15px",
  borderRadius:"20px",
  fontSize:"14px",
  fontWeight:"bold"
},

money:{
  fontSize:"18px",
  fontWeight:"bold",
  color:"#16a34a"
},

};


export default Jobs;