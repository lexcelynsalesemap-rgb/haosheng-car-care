import { useParams, Link } from "react-router-dom";


function JobDetails(){



  const {id} = useParams();


  const jobs =
    JSON.parse(localStorage.getItem("jobs")) || [];


 const job = jobs.find(
  j => String(j.id) === String(id)
);



  if(!job){

    return (
      <div style={styles.page}>
        <h2>Job not found</h2>

        <Link to="/jobs">
          Back to Jobs
        </Link>
      </div>
    );

  }


  return(

    <div style={styles.card}>

  <h2>👤 Customer Information</h2>

  <p><strong>Name:</strong> {job.customer || "-"}</p>
  <p><strong>Phone:</strong> {job.phone || "-"}</p>
  <p><strong>Source:</strong> {job.source || "-"}</p>

  <hr />

  <h2>🚗 Vehicle Information</h2>

  <p><strong>Brand:</strong> {job.carModel || "-"}</p>
  <p><strong>Model:</strong> {job.carType || "-"}</p>
  <p><strong>Plate:</strong> {job.plate || "-"}</p>
  <p><strong>Color:</strong> {job.color || "-"}</p>
  <p><strong>Chassis:</strong> {job.chassis || "-"}</p>

  <hr />

  <h2>🔧 Services</h2>

  <p>
    {job.services?.length
      ? job.services.join(", ")
      : "No services selected"}
  </p>

  <hr />

  <h2>💰 Payment Summary</h2>

  <p><strong>Price:</strong> ${job.price || 0}</p>
  <p><strong>Deposit:</strong> ${job.deposit || 0}</p>
  <p><strong>Balance:</strong> ${job.balance || 0}</p>

  <hr />

  <h2>📋 Job Status</h2>

  <p>{job.status || "New"}</p>

  {job.voucherNumber && (
    <>
      <hr />
      <h2>🎟 Voucher</h2>
      <p>{job.voucherNumber}</p>
    </>
  )}

  <div style={styles.buttonRow}>

    <Link to={`/edit-job/${job.id}`}>
      <button style={styles.editButton}>
        ✏️ Edit Job
      </button>
    </Link>

    <Link to={`/invoice/${job.id}`}>
      <button style={styles.invoiceButton}>
        🧾 Invoice
      </button>
    </Link>

    <Link to="/jobs">
      <button style={styles.button}>
        ← Back
      </button>
    </Link>

  </div>

</div>

  );

}



const styles={

page:{
 padding:"30px",
 background:"#f1f5f9",
 minHeight:"100vh"
},

card:{
 background:"white",
 padding:"30px",
 borderRadius:"20px",
 boxShadow:"0 8px 20px rgba(0,0,0,0.08)"
},

button:{
 background:"#2563eb",
 color:"white",
 border:"none",
 padding:"12px 25px",
 borderRadius:"10px",
 cursor:"pointer"
},
editButton:{
  background:"#16a34a",
  color:"white",
  border:"none",
  padding:"12px 25px",
  borderRadius:"10px",
  cursor:"pointer",
  marginRight:"10px"
},
invoiceButton: {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 25px",
  borderRadius: "10px",
  cursor: "pointer",
  marginRight: "10px"
},
buttonRow: {
  display: "flex",
  gap: "10px",
  marginTop: "30px",
  flexWrap: "wrap"
},
};


export default JobDetails;