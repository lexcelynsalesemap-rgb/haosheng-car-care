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

(sum,service)=>{

return sum +

Number(
serviceDetails[service]?.price || 0
);

},

0

);






function chooseService(service,price){


if(services.includes(service)){


setServices(

services.filter(
s=>s!==service
)

);


const copy={...serviceDetails};

delete copy[service];

setServiceDetails(copy);


}

else{


setServices([

...services,

service

]);


setServiceDetails({

...serviceDetails,


[service]:{

price:price,

discount:0,

quantity:1,

technicians:[]

}

});


}


}







async function saveJob(){

console.log("SAVE CLICKED");
console.log("DEPOSIT:", deposit);
console.log("PAYMENT METHOD:", paymentMethod);


const job={


customer,

phone,

date,


source:

source==="Other"

?

otherSource

:

source,


voucherNumber,


carModel,

carType,

color,

chassis,

plate,


services,

serviceDetails,


paymentMethod,


price:Number(total),


discount:Number(discount),


deposit:Number(deposit),


balance:

Number(total-discount-deposit),


status:"New"


};





const {data:jobData,error}=await supabase

.from("jobs")

.insert([job])

.select()

.single();





if(error){

alert(error.message);

console.log(error);

return;

}





// ==============================
// CREATE PAYMENT RECORD
// ==============================




if(Number(deposit)>0){

  const {data:paymentData,error:paymentError}=await supabase
  .from("payments")
  .insert([{

    job_id: jobData.id,
    amount: Number(deposit),
    payment_method: paymentMethod,
    payment_date: new Date().toISOString(),
    notes:"Initial deposit"

  }])
  .select();


  console.log(
    "PAYMENT INSERT RESULT:",
    paymentData,
    paymentError
  );

}



// CREATE JOB SERVICES


for(const service of services){



const {data:serviceData,error:serviceError}=await supabase

.from("job_services")

.insert([{


job_id:jobData.id,


service_name:service,


price:Number(

serviceDetails[service]?.price || 0

)


}])

.select()

.single();




console.log(
"SERVICE INSERT:",
serviceData,
serviceError
);




if(serviceError){

continue;

}






const technicianRows =

serviceDetails[service]

?.technicians

?.map(t=>({


service_id:serviceData.id,


technician_id:t.id,


commission:Number(t.commission || 0)


})) || [];






if(technicianRows.length){



const {error:techError}=await supabase

.from("service_technicians")

.insert(technicianRows);



console.log(
"TECH INSERT:",
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






<h2>
Vehicle Information
</h2>




<input

placeholder="Car Model"

value={carModel}

onChange={(e)=>setCarModel(e.target.value)}

/>




<input

placeholder="Car Type"

value={carType}

onChange={(e)=>setCarType(e.target.value)}

/>




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
serviceDetails[service]?.price || 0
}



onChange={(e)=>{


setServiceDetails({


...serviceDetails,


[service]:{


...serviceDetails[service],


price:Number(e.target.value)


}


});


}}


/>






<input

type="number"

placeholder="Discount"


value={
serviceDetails[service]?.discount || 0
}



onChange={(e)=>{


setServiceDetails({


...serviceDetails,


[service]:{


...serviceDetails[service],


discount:Number(e.target.value)


}


});


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



setServiceDetails({


...serviceDetails,


[service]:{


...serviceDetails[service],


technicians:updated


}


});


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


const updated =

serviceDetails[service]

.technicians

.map(t=>{


if(t.id===person.id){


return {

...t,

commission:Number(e.target.value)

};


}


return t;


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