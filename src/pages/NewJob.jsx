import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";


function NewJob(){


const today = new Date()
.toISOString()
.split("T")[0];


// CUSTOMER

const [customer,setCustomer]=useState("");
const [phone,setPhone]=useState("");
const [date,setDate]=useState(today);


// SOURCE

const [source,setSource]=useState("");
const [otherSource,setOtherSource]=useState("");
const [voucherNumber,setVoucherNumber]=useState("");


// VEHICLE

const [carModel,setCarModel]=useState("");
const [carType,setCarType]=useState("");
const [color,setColor]=useState("");
const [chassis,setChassis]=useState("");
const [plate,setPlate]=useState("");


// SERVICES

const [services,setServices]=useState([]);

const [serviceDetails,setServiceDetails]=useState({});


// PAYMENT

const [deposit,setDeposit]=useState(0);
const [discount,setDiscount]=useState(0);
const [paymentMethod,setPaymentMethod]=useState("");


// TECHNICIANS

const [technicians,setTechnicians]=useState([]);
const [serviceList,setServiceList]=useState([]);



async function loadServices() {

  console.log("URL:", supabase.supabaseUrl);

  const { data, error, status } = await supabase
    .from("services")
    .select("*");

  console.log("STATUS:", status);
  console.log("DATA:", data);
  console.log("ERROR:", error);

  setServiceList(data || []);
}



async function loadTechnicians(){

const {data,error}=await supabase

.from("technicians")

.select("*")

.eq("active",true);



if(error){

console.log(error);

return;

}


setTechnicians(data || []);

}



useEffect(()=>{

loadTechnicians();

loadServices();

},[]);





const total = services.reduce(
  (sum, serviceName) => {

    const details =
      serviceDetails[serviceName] || {};

    const price =
      Number(details.price || 0);

    const serviceDiscount =
      Number(details.discount || 0);

    return sum + Math.max(
      price - serviceDiscount,
      0
    );
  },
  0
);






function chooseService(service, price) {

  console.log("CHOOSING SERVICE:", service, price);

  if (services.includes(service)) {

    setServices(prev =>
      prev.filter(s => s !== service)
    );

    setServiceDetails(prev => {
      const copy = { ...prev };
      delete copy[service];
      return copy;
    });

  } else {

    setServices(prev => [
      ...prev,
      service
    ]);

    setServiceDetails(prev => ({
      ...prev,
      [service]: {
        price: Number(price || 0),
        discount: 0,
        quantity: 1,
        technicians: []
      }
    }));
  }
}


useEffect(() => {

  const isTeyseer =
    source === "Teyseer Motors" ||
    source === "Teyseer Motors - Bahaa" ||
    source === "Teyseer Motors - Salah";


  // Only Full WTT gets Teyseer price
  if (!isTeyseer || !services.includes("Full WTT")) return;


  let price = null;


  if (carType === "GWM") {
    price = 1000;
  }

  else if (carType === "Suzuki") {
    price = 800;
  }


  if (price === null) return;


  setServiceDetails(prev => ({
    ...prev,

    "Full WTT": {
      ...prev["Full WTT"],
      price: price
    }

  }));


}, [source, carType, services]);




async function saveJob(){

console.log("SAVE CLICKED");


const job = {
  customer,
  phone,
  date,

  source:
    source === "Other"
      ? otherSource
      : source,

  voucherNumber,

  carModel,
  carType,
  color,
  chassis,
  plate,

  // SAVE SERVICES INTO JOBS TABLE
  services,
  serviceDetails,

  paymentMethod,

  price: Number(total),

  discount: Number(discount),

  deposit: Number(deposit),

  balance:
    Number(total - discount - deposit),

  status: "New"
};



//
// CREATE JOB
//

const {data:jobData,error:jobError}=await supabase
.from("jobs")
.insert([job])
.select()
.single();



if(jobError){

console.log(jobError);
alert(jobError.message);
return;

}



console.log("JOB CREATED:",jobData);





//
// CREATE PAYMENT
//

if(Number(deposit)>0){


const {error}=await supabase

.from("payments")

.insert([{

job_id:jobData.id,

amount:Number(deposit),

payment_method:paymentMethod,

payment_source:job.source,

payment_date:new Date(),

notes:"Initial deposit"

}]);



if(error){

console.log("PAYMENT ERROR",error);

}


}







//
// CREATE JOB SERVICES
//

for(const serviceName of services){



const details =
serviceDetails[serviceName];



const isTeyseer =

job.source==="Teyseer Motors" ||

job.source==="Teyseer Motors - Bahaa" ||

job.source==="Teyseer Motors - Salah";



let owner="Sales Team";



if(
isTeyseer &&
serviceName.toLowerCase().includes("wtt")
){

owner="Teyseer";

}





const {data:serviceRow,error:serviceError}=

await supabase

.from("job_services")

.insert([{

job_id:jobData.id,

service_name:serviceName,

price:Number(details.price || 0),

discount:Number(details.discount || 0),

owner:owner

}])

.select()

.single();





console.log(
"INSERT JOB SERVICE",
serviceRow,
serviceError
);





if(serviceError){

continue;

}





//
// TECHNICIANS
//

const techRows =

(details.technicians || [])

.map(t=>({

service_id:serviceRow.id,

technician_id:t.id,

commission:Number(t.commission || 0)

}));





if(techRows.length){


const {error:techError}=

await supabase

.from("service_technicians")

.insert(techRows);



console.log(
"TECH INSERT",
techError
);


}



}



alert("Job Saved Successfully!");





}
return (

<div style={styles.page}>


<h1>
New Job
</h1>



<div style={styles.form}>


<h2>
Customer Information
</h2>


<input
placeholder="Customer Name"
value={customer}
onChange={(e)=>setCustomer(e.target.value)}
/>



<input
placeholder="Phone Number"
value={phone}
onChange={(e)=>setPhone(e.target.value)}
/>



<label>
Date
</label>


<input

type="date"

value={date}

onChange={(e)=>setDate(e.target.value)}

/>





<h2>
Source
</h2>


<select

value={source}

onChange={(e)=>setSource(e.target.value)}

>


<option value="">
Select Source
</option>


<option>
Teyseer Motors
</option>


<option>
Teyseer Motors - Bahaa
</option>


<option>
Teyseer Motors - Salah
</option>


<option>
Bahaa
</option>


<option>
Salah
</option>


<option>
Walk-in
</option>


<option>
Other
</option>


</select>




{

source==="Other" &&


<input

placeholder="Other Source"

value={otherSource}

onChange={(e)=>setOtherSource(e.target.value)}

/>


}





{

(
source==="Teyseer Motors" ||

source==="Teyseer Motors - Bahaa" ||

source==="Teyseer Motors - Salah"

)

&&


<input

placeholder="Voucher Number"

value={voucherNumber}

onChange={(e)=>setVoucherNumber(e.target.value)}

/>


}





<h2>Vehicle Information</h2>

<input
  placeholder="Car Model"
  value={carModel}
  onChange={(e)=>setCarModel(e.target.value)}
/>

{/* Replace the old Car Type input with this */}
<label>Car Type</label>

<select
  value={carType}
  onChange={(e)=>setCarType(e.target.value)}
>
  <option value="">Select Car Type</option>
  <option value="GWM">GWM</option>
  <option value="Suzuki">Suzuki</option>
  <option value="Toyota">Toyota</option>
  <option value="Nissan">Nissan</option>
  <option value="Honda">Honda</option>
  <option value="Kia">Kia</option>
  <option value="Hyundai">Hyundai</option>
  <option value="Ford">Ford</option>
  <option value="BMW">BMW</option>
  <option value="Mercedes">Mercedes</option>
  <option value="Audi">Audi</option>
</select>

<input
  placeholder="Color"
  value={color}
  onChange={(e)=>setColor(e.target.value)}
/>






<input

placeholder="Chassis Number"

value={chassis}

onChange={(e)=>setChassis(e.target.value)}

/>




<input

placeholder="Plate Number"

value={plate}

onChange={(e)=>setPlate(e.target.value)}

/>




<h2>Services</h2>




{

serviceList.map(serviceItem=>{


const service=serviceItem.name;


return (

<div

key={serviceItem.id}

style={styles.serviceBox}

>


<label>


<input

type="checkbox"


checked={services.includes(service)}


onChange={()=>chooseService(
service,
serviceItem.price
)}


/>


{" "}

{service}


</label>






{

services.includes(service) &&


<div>


<br/>




<input

type="number"

placeholder="Price"


value={
  serviceDetails?.[service]?.price || 0
}



onChange={(e) => {

  setServiceDetails(prev => ({
    ...prev,

    [service]: {
      ...(prev[service] || {}),
      price: Number(e.target.value)
    }

  }));

}}


/>






<input

type="number"

placeholder="Discount"


value={
  serviceDetails?.[service]?.discount || 0
}



onChange={(e) => {

  setServiceDetails(prev => ({
    ...prev,

    [service]: {
      ...(prev[service] || {}),
      discount: Number(e.target.value)
    }

  }));

}}


/>







<h4>
Technicians
</h4>






{

technicians.map(person=>{


const selected =

serviceDetails[service]

?.technicians

?.find(
t=>t.id===person.id
);



return (


<div key={person.id}>


<label>


<input

type="checkbox"


checked={!!selected}



onChange={(e)=>{


const oldTech =

serviceDetails[service]

?.technicians || [];



let updated;



if(e.target.checked){


updated=[

...oldTech,

{

id:person.id,

commission:0

}

];


}

else{


updated=

oldTech.filter(

t=>t.id!==person.id

);


}



setServiceDetails(prev => ({
  ...prev,

  [service]: {
    ...(prev[service] || {}),
    technicians: updated
  }
}));


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


setServiceDetails(prev => {

  const updated =
    (prev[service]?.technicians || []).map(t => {

      if (t.id === person.id) {

        return {
          ...t,
          commission: Number(e.target.value)
        };

      }

      return t;
    });

  return {
    ...prev,

    [service]: {
      ...(prev[service] || {}),
      technicians: updated
    }
  };

});



setServiceDetails({


...serviceDetails,


[service]:{


...serviceDetails[service],


technicians:updated


}


});


}}



/>


}



</div>


)


})

}




</div>


}




</div>


)


})

}





<h2>
Payment
</h2>


<label>
Payment Method
</label>

<select

value={paymentMethod}

onChange={(e)=>setPaymentMethod(e.target.value)}

>

<option value="">
Select Payment Method
</option>

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


<label>
Discount
</label>

<input

type="number"

placeholder="Enter discount"

value={discount}

onChange={(e)=>
setDiscount(Number(e.target.value))
}

/>



<label>
Deposit Paid
</label>

<input

type="number"

placeholder="Enter deposit"

value={deposit}

onChange={(e)=>
setDeposit(Number(e.target.value))
}

/>



<h3>
Total:
QAR {total}
</h3>


<h3>
Balance Due:
QAR {total - discount - deposit}
</h3>

<button

type="button"

onClick={saveJob}

style={styles.button}

>

SAVE JOB

</button>




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



form:{

background:"#fff",

padding:"25px",

borderRadius:"12px",

maxWidth:"650px",

display:"flex",

flexDirection:"column",

gap:"12px"

},




serviceBox:{

border:"1px solid #ddd",

padding:"12px",

borderRadius:"10px",

marginBottom:"10px"

},




button:{

background:"#16a34a",

color:"white",

border:"none",

padding:"14px",

borderRadius:"10px",

fontSize:"16px",

cursor:"pointer"

}



};




export default NewJob;