import { useState } from "react";


function NewJob() {

  const today = new Date().toISOString().split("T")[0];


  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today);

  const [source, setSource] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");

  const [otherSource, setOtherSource] = useState("");

  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [plate, setPlate] = useState("");

  const [services, setServices] = useState([]);
const [serviceDetails, setServiceDetails] = useState({});

  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);

const [paymentMethod, setPaymentMethod] = useState("");

  const servicePrices = {

    "Normal Wash": 68,
    "Special Wash": 360,
    "Full PPF": 6500,
    "Half Body PPF": 2800,
    "Full WTT": 2500,
    "Full WTT With Sunroof": 2800

  };



  const calculatedPrice = services.reduce(

  (total, service) => 
    total + serviceDetails[service].price,

  0

);



  const balance = calculatedPrice - deposit;



  function chooseService(service) {


  if (services.includes(service)) {


    setServices(
      services.filter(item => item !== service)
    );


    const updated = {...serviceDetails};

    delete updated[service];

    setServiceDetails(updated);


  } else {


    setServices([
      ...services,
      service
    ]);


    setServiceDetails({

      ...serviceDetails,

      [service]:{

        price: servicePrices[service],

        discount:0,

        quantity:1

      }

    });


  }

}


  function saveJob() {


  const oldJobs =
    JSON.parse(localStorage.getItem("jobs")) || [];


  const invoiceNumber =
    "HS-" + String(oldJobs.length + 1).padStart(4, "0");



  const job = {


    id: Date.now(),

    invoiceNumber,


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


    services,
serviceDetails,

    price: Number(calculatedPrice),

    discount: Number(discount),

    deposit: Number(deposit),


    balance:
      Number(calculatedPrice)
      - Number(discount)
      - Number(deposit),

paymentMethod,
    status:"New"


  };



  localStorage.setItem(

    "jobs",

    JSON.stringify([

      ...oldJobs,

      job

    ])

  );



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
          onChange={(e)=>setCustomer(e.target.value)}
        />


        <input
          placeholder="Phone Number"
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



        <label>
          How did they know about us?
        </label>



        <select

          value={source}

          onChange={(e)=>setSource(e.target.value)}

        >

          <option value="">
            Select Source
          </option>


          <option value="Teyseer Motors">
            Teyseer Motors
          </option>


          <option value="Teyseer Motors - Salah">
            Teyseer Motors - Salah
          </option>


          <option value="Teyseer Motors - Bahaa">
            Teyseer Motors - Bahaa
          </option>


          <option value="Walk-in">
            Walk-in
          </option>


          <option value="Other">
            Other
          </option>


        </select>




        {source === "Other" && (


          <input

            placeholder="Enter Source"

            value={otherSource}

            onChange={(e)=>setOtherSource(e.target.value)}

          />


        )}






        {(

          source === "Teyseer Motors" ||

          source === "Teyseer Motors - Salah" ||

          source === "Teyseer Motors - Bahaa"

        ) && (


          <input

            placeholder="Teyseer Motors Voucher Number"

            value={voucherNumber}

            onChange={(e)=>setVoucherNumber(e.target.value)}

          />


        )}






        <h2>
          Vehicle Information
        </h2>



        <input
          placeholder="Car Model"
          onChange={(e)=>setCarModel(e.target.value)}
        />


        <input
          placeholder="Car Type"
          onChange={(e)=>setCarType(e.target.value)}
        />


        <input
          placeholder="Color"
          onChange={(e)=>setColor(e.target.value)}
        />


        <input
          placeholder="Chassis Number"
          onChange={(e)=>setChassis(e.target.value)}
        />


        <input
          placeholder="Plate Number"
          onChange={(e)=>setPlate(e.target.value)}
        />





        <h2>
          Services
        </h2>



        {Object.keys(servicePrices).map(service => (

  <div key={service}>


    <input

      type="checkbox"

      checked={services.includes(service)}

      onChange={()=>chooseService(service)}

    />


    {service}



    {services.includes(service) && (

      <>


        <input

          type="number"

          placeholder="Price"

          value={serviceDetails[service]?.price || 0}

          onChange={(e)=>

            setServiceDetails({

              ...serviceDetails,

              [service]:{

                ...serviceDetails[service],

                price:Number(e.target.value)

              }

            })

          }

        />



        <input

          type="number"

          placeholder="Discount"

          value={serviceDetails[service]?.discount || 0}

          onChange={(e)=>

            setServiceDetails({

              ...serviceDetails,

              [service]:{

                ...serviceDetails[service],

                discount:Number(e.target.value)

              }

            })

          }

        />


      </>

    )}


  </div>

))}





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



<input

  type="number"

  placeholder="Discount"

  value={discount}

  onChange={(e)=>setDiscount(Number(e.target.value))}

/>



<input

  type="number"

  placeholder="Deposit Paid"

  value={deposit}

  onChange={(e)=>setDeposit(Number(e.target.value))}

/>



<h3>
  Total: {calculatedPrice}
</h3>


<h3>
  Balance Due:
  {calculatedPrice - discount - deposit}
</h3>

        <button

          type="button"

          onClick={saveJob}

        >

          SAVE JOB

        </button>




      </div>


    </div>


  );

}




const styles = {


  page:{

    padding:"30px",

    background:"var(--bg)",

    minHeight:"100vh"

  },


  form:{

    background:"white",

    padding:"25px",

    borderRadius:"12px",

    maxWidth:"500px",

    display:"flex",

    flexDirection:"column",

    gap:"10px"

  }


};



export default NewJob;