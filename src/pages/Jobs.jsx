import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase/client.js";


function Jobs() {


  const [jobs, setJobs] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [sourceFilter, setSourceFilter] = useState("All");



  useEffect(() => {

    loadJobs();


    const channel = supabase
      .channel("jobs-page-changes")
      .on(
        "postgres_changes",
        {
          event:"*",
          schema:"public",
          table:"jobs"
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();



    return () => {

      supabase.removeChannel(channel);

    };


  }, []);




  async function loadJobs(){

    const {data,error} = await supabase
      .from("jobs")
      .select("*")
      .order("created_at",{ascending:false});


    if(error){

      console.error(error);
      return;

    }


    setJobs(data || []);

  }






  async function updateStatus(id,newStatus){


    const {error} = await supabase
      .from("jobs")
      .update({
        status:newStatus
      })
      .eq("id",id);



    if(error){

      console.error(error);
      return;

    }



    setJobs(prev =>

      prev.map(job =>

        job.id === id

        ? {...job,status:newStatus}

        : job

      )

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




    const matchesSource =

      sourceFilter === "All" ||

      job.source === sourceFilter;




    return (

      matchesSearch &&

      matchesStatus &&

      matchesSource

    );


  });





async function deleteJob(id){

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this job?"
  );


  if(!confirmDelete){
    return;
  }



  const {error} = await supabase

  .from("jobs")

  .delete()

  .eq("id",id);



  if(error){

    console.error(error);

    alert(error.message);

    return;

  }



  setJobs(prev =>

    prev.filter(job => job.id !== id)

  );


  alert("Job Deleted");

}


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





<select

value={statusFilter}

onChange={(e)=>setStatusFilter(e.target.value)}

style={styles.filter}

>


<option value="All">
All Status
</option>


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





<select

value={sourceFilter}

onChange={(e)=>setSourceFilter(e.target.value)}

style={styles.filter}

>


<option value="All">
All Sources
</option>


<option value="Teyseer Motors">
Teyseer Motors
</option>


<option value="Teyseer Motors - Bahaa">
Teyseer Motors - Bahaa
</option>


<option value="Teyseer Motors - Salah">
Teyseer Motors - Salah
</option>


<option value="Bahaa">
Bahaa
</option>


<option value="Salah">
Salah
</option>


<option value="Walk-in">
Walk-in
</option>


<option value="Other">
Other
</option>


</select>








{
filteredJobs.length === 0 ?


<p>
No jobs found
</p>


:


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

job.status==="Finished"

?"#16a34a"

:

job.status==="Delivered"

?"#0891b2"

:

job.status==="In Progress"

?"#ea580c"

:

"#2563eb"

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

Services:

{

job.services?.length

?

job.services.join(", ")

:

"No services"

}

</p>





<p style={styles.money}>

💰 Balance: QAR {job.balance || 0}

</p>





<p>

Source:

{job.source || "Not specified"}

</p>






<select

value={job.status || "New"}

onChange={(e)=>
updateStatus(job.id,e.target.value)
}

style={styles.status}

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





<br/>
<br/>





<Link to={`/edit-job/${job.id}`}>

<button style={styles.editButton}>

✏️ Edit

</button>

</Link>





<Link to={`/invoice/${job.id}`}>

<button style={styles.invoiceButton}>

🧾 Invoice

</button>

</Link>

<button

style={styles.deleteButton}

onClick={()=>deleteJob(job.id)}

>

🗑 Delete

</button>


</div>


))


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

marginBottom:"15px",

borderRadius:"8px"

},



filter:{

padding:"12px",

marginLeft:"10px",

borderRadius:"8px"

},



jobCard:{

background:"white",

padding:"25px",

marginBottom:"20px",

borderRadius:"18px",

boxShadow:"0 8px 20px rgba(0,0,0,0.08)"

},



jobHeader:{

display:"flex",

justifyContent:"space-between",

alignItems:"center"

},



badge:{

color:"white",

padding:"8px 15px",

borderRadius:"20px",

fontWeight:"bold"

},



money:{

fontSize:"18px",

fontWeight:"bold",

color:"#16a34a"

},



status:{

padding:"8px",

borderRadius:"8px"

},



editButton:{

background:"#2563eb",

color:"white",

border:"none",

padding:"10px 18px",

borderRadius:"10px",

marginRight:"10px",

cursor:"pointer"

},



invoiceButton:{

background:"#16a34a",

color:"white",

border:"none",

padding:"10px 18px",

borderRadius:"10px",

cursor:"pointer"

},

deleteButton:{

background:"#dc2626",

color:"white",

border:"none",

padding:"10px 18px",

borderRadius:"10px",

cursor:"pointer"

},
};



export default Jobs;