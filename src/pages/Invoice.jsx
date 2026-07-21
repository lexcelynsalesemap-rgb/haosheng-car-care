import { useParams } from "react-router-dom";


function Invoice() {


  const { id } = useParams();


  const jobs =
    JSON.parse(localStorage.getItem("jobs")) || [];


  const job =
    jobs.find(item => String(item.id) === String(id));



  if (!job) {

    return (

      <div>

        <h1>
          Invoice Not Found
        </h1>

      </div>

    );

  }



  return (

    <div style={styles.page}>


      <div style={styles.invoice}>


        <div style={styles.header}>


          <h1>
            HAOSHENG CAR SERVICE AND ACCESSORIES
          </h1>


          <h2>
            هاوشنغ لخدمات وزينة السيارات
          </h2>


          <p>
            Building 358, Salwa Road, Doha - Qatar
          </p>


          <p>
            Tel: +974 3368 1888 |
            C.R.NO: 199725 |
            Email: info@haoshengcar.com
          </p>


        </div>



        <hr />



        <div style={styles.row}>


          <div>

            <h2>
              INVOICE
            </h2>


            <p>
              NAME: {job.customer}
            </p>


            <p>
              DATE: {job.date}
            </p>


            <p>
              MOBILE NUMBER: {job.phone}
            </p>


          </div>



          <div style={styles.right}>


            <h2>
              الفاتورة
            </h2>


            <p>
              INVOICE NUMBER:
              {job.invoiceNumber || "HS-0001"}
            </p>


            <p>
              التاريخ:
              {job.date}
            </p>


          </div>


        </div>




        <hr />



        <h2>
          VEHICLE INFORMATION
          <br/>
          معلومات المركبة
        </h2>



        <table>


          <tbody>


            <tr>

              <td>
                MAKE
              </td>

              <td>
                {job.carType}
              </td>


              <td>
                العلامة
              </td>


            </tr>



            <tr>

              <td>
                MODEL
              </td>

              <td>
                {job.carModel}
              </td>


              <td>
                النوع
              </td>


            </tr>




            <tr>

              <td>
                COLOR
              </td>

              <td>
                {job.color}
              </td>


              <td>
                اللون
              </td>


            </tr>




            <tr>

              <td>
                CHASSIS
              </td>

              <td>
                {job.chassis}
              </td>


              <td>
                الهيكل
              </td>


            </tr>




            <tr>

              <td>
                PLATE
              </td>

              <td>
                {job.plate}
              </td>


              <td>
                اللوحة
              </td>


            </tr>


          </tbody>


        </table>        <hr />


        <h2>
          SERVICE OFFERED
          <br/>
          الخدمة المقدمة
        </h2>



        <table style={styles.table}>


          <thead>

            <tr>

              <th style={styles.cell}>
  TYPE OF SERVICE
</th>

              <th style={styles.cell}>
                PRICE
              </th>

              <th style={styles.cell}>
                QTY
              </th>

              <th style={styles.cell}>
                DISCOUNT
              </th>

              <th style={styles.cell}>
                TOTAL
              </th>


            </tr>


          </thead>



          <tbody>


            {
  job.services?.map((service,index)=>(

    <tr key={index}>

      <td style={styles.cell}>
        {service}
      </td>


      <td style={styles.cell}>
        QAR {job.serviceDetails?.[service]?.price || 0}
      </td>


      <td style={styles.cell}>
        {job.serviceDetails?.[service]?.quantity || 1}
      </td>


      <td style={styles.cell}>
        QAR {job.serviceDetails?.[service]?.discount || 0}
      </td>


      <td style={styles.cell}>
        QAR {
          (job.serviceDetails?.[service]?.price || 0)
          -
          (job.serviceDetails?.[service]?.discount || 0)
        }
      </td>


    </tr>

  ))
}


          </tbody>


        </table>




        <br />



        <div style={styles.amount}>


          <p>
  TOTAL AMOUNT: QAR {
    job.services?.reduce(
      (total, service) =>
        total + (job.serviceDetails?.[service]?.price || 0),
      0
    )
  }
</p>


<p>
  TOTAL DISCOUNT: QAR {
    job.services?.reduce(
      (total, service) =>
        total + (job.serviceDetails?.[service]?.discount || 0),
      0
    )
  }
</p>


<h3>
  NET AMOUNT: QAR {
    job.services?.reduce(
      (total, service) =>
        total +
        (
          (job.serviceDetails?.[service]?.price || 0)
          -
          (job.serviceDetails?.[service]?.discount || 0)
        ),
      0
    )
  }
</h3>

        </div>




        <hr />



        <p>
  PAYMENT METHOD:
  {job.paymentMethod || "Not Selected"}
</p>



        {
          job.voucherNumber && (

            <p>
              TEYSEER MOTORS VOUCHER:
              {job.voucherNumber}
            </p>

          )
        }





        <h3>
          PPF WARRANTY
        </h3>


        <p>
          8 YEARS
        </p>


        <p>
          FREE CHECK UP AFTER 1 WEEK FOR PPF
        </p>


        <p dir="rtl">
          فحص مجاني بعد أسبوع واحد لـ PPF
        </p>



        <p>
          1X FREE AFTER HALF YEAR PPF CHEMICAL SERVICE PROTECTION
        </p>


        <p dir="rtl">
          بعد نصف سنة تحصل على سيرفس للحماية مجاني لمرة واحدة
        </p>





        <div style={styles.signatures}>


          <div>

            <p>
              CUSTOMER'S SIGNATURE
            </p>


            <br/>

            ______________________


          </div>



          <div>

            <p>
              AUTHORIZED SIGNATURE
            </p>


            <br/>

            ______________________


          </div>


        </div>




        


      </div>





      <div style={styles.warranty}>


        <h1>
          Terms and Conditions
        </h1>


        <h2>
          ❖ Warranty
        </h2>


        <p>
          We, the Haosheng Car Care team, are pleased to offer you a warranty when you install full vehicle protection or full front-end protection excluding misuse.
        </p>


        <p>
          • Quarter panel protection: 5-year warranty.
        </p>


        <p>
          • Protection warranty includes Nano-ceramic shine, yellowing, self-healing of scratches, cracking, and paint removal.
        </p>


        <p>
          • Thermal insulation warranty: 10 years.
        </p>


        <p>
          • Nano-ceramic service: 2 years for shine, 6 months for water repellency.
        </p>



        <h2>
          ❖ Conditions
        </h2>


        <p>
          • Customer signature confirms acceptance of the protection installed on the vehicle.
        </p>


        <p>
          • Warranty is void if improper washing materials are used.
        </p>


        <p>
          • Warranty does not apply if repaired or modified by unauthorized persons.
        </p>


        <p>
          • Annual maintenance inspection is required.
        </p>



        <hr />



        <h1 dir="rtl">
          شروط وأحكام
        </h1>


        <h2 dir="rtl">
          ❖ ضمان
        </h2>


        <p dir="rtl">
          تقدم هاوشنغ للعناية بالسيارات ضماناً عند تركيب حماية كاملة للمركبة أو حماية كاملة للواجهة الأمامية باستثناء سوء الاستخدام.
        </p>


        <p dir="rtl">
          • حماية ربع لوحة السيارة: ضمان 5 سنوات.
        </p>


        <p dir="rtl">
          • يشمل الضمان لمعان النانو سيراميك ومقاومة الاصفرار والمعالجة الذاتية للخدوش.
        </p>


        <p dir="rtl">
          • ضمان العزل الحراري: 10 سنوات.
        </p>


        <p dir="rtl">
          • يجب الالتزام بالصيانة الدورية للحفاظ على الضمان.
        </p>


      </div>


    </div>

  );

}



const styles = {


page:{

  background:"#fff",

  padding:"10px"

},



invoice:{

  width:"190mm",

  margin:"auto",

  padding:"15px",

  fontSize:"12px",

  lineHeight:"1.2",

  pageBreakAfter:"always"

},



header:{

  textAlign:"center"

},



row:{

  display:"flex",

  justifyContent:"space-between"

},



right:{

  textAlign:"right"

},



amount:{

  textAlign:"right"

},



signatures:{

  display:"flex",

  justifyContent:"space-between",

  marginTop:"25px"

},



footer:{

  marginTop:"25px",

  textAlign:"center",

  fontSize:"11px"

},



warranty:{

  width:"190mm",

  margin:"auto",

  padding:"20px",

  fontSize:"12px",

  lineHeight:"1.3",

  pageBreakBefore:"always"

},
table:{
  width:"100%",
  borderCollapse:"collapse",
  marginTop:"20px",
},

cell:{
  border:"1px solid #000",
  padding:"10px",
  textAlign:"center",
  fontSize:"13px",
},

};



export default Invoice;