import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";


function EditJob(){

  const {id} = useParams();
  const navigate = useNavigate();


  const jobs =
    JSON.parse(localStorage.getItem("jobs")) || [];


  const oldJob =
    jobs.find(job => job.id === Number(id));


  const [customer,setCustomer] =
    useState(oldJob?.customer || "");

  const [phone,setPhone] =
    useState(oldJob?.phone || "");

  const [carModel,setCarModel] =
    useState(oldJob?.carModel || "");

  const [plate,setPlate] =
    useState(oldJob?.plate || "");

  const [price,setPrice] =
    useState(oldJob?.price || 0);


  function save(){

    const updated =
      jobs.map(job => {

        if(job.id === Number(id)){

          return {
            ...job,
            customer,
            phone,
            carModel,
            plate,
            price
          };

        }

        return job;

      });


    localStorage.setItem(
      "jobs",
      JSON.stringify(updated)
    );


    alert("Job Updated");


    navigate("/jobs");

  }



  return (

    <div style={{padding:"30px"}}>

      <h1>Edit Job</h1>


      <input
        value={customer}
        placeholder="Customer Name"
        onChange={(e)=>setCustomer(e.target.value)}
      />


      <br/>


      <input
        value={phone}
        placeholder="Phone"
        onChange={(e)=>setPhone(e.target.value)}
      />


      <br/>


      <input
        value={carModel}
        placeholder="Car Model"
        onChange={(e)=>setCarModel(e.target.value)}
      />


      <br/>


      <input
        value={plate}
        placeholder="Plate Number"
        onChange={(e)=>setPlate(e.target.value)}
      />


      <br/>


      <input
        type="number"
        value={price}
        placeholder="Price"
        onChange={(e)=>setPrice(Number(e.target.value))}
      />


      <br/><br/>


      <button onClick={save}>
        SAVE CHANGES
      </button>


    </div>

  );

}


export default EditJob;