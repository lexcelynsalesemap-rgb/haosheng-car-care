import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

function Invoice() {


  const { id } = useParams();


const [job, setJob] = useState(null);
const [loading, setLoading] = useState(true);


useEffect(() => {

  loadJob();

}, []);



async function loadJob(){

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();


  if(error){

    console.error(error);
    return;

  }


  setJob(data);
  setLoading(false);

}



 if (loading) {

return (

<div>
<h1>Loading Invoice...</h1>
</div>

);

}


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

  <div style={styles.headerContent}>

    {/* GA LOGO */}
    <div style={styles.logoContainer}>
     <img
  src={gaLogo}
  alt="GA Logo"
  style={styles.logo}
/>
    </div>

    {/* COMPANY INFORMATION */}
    <div style={styles.companyInfo}>

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

  </div>

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
  RECEIPT NUMBER: {job.receipt_number}
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
  TECHNICIAN
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

{
  job.serviceDetails?.[service]?.technicians?.length

  ?

  job.serviceDetails[service]
  .technicians
  .join(", ")

  :

  "-"

}

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

(
job.serviceDetails?.[service]?.price || 0
)

*

(
job.serviceDetails?.[service]?.quantity || 1
)

-

(
job.serviceDetails?.[service]?.discount || 0
)

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
          total +
          (
            (Number(job.serviceDetails?.[service]?.price) || 0)
            *
            (Number(job.serviceDetails?.[service]?.quantity) || 1)
          ),
        0
      )
    }
  </p>

  <p>
    DISCOUNT: QAR {
      job.services?.reduce(
        (total, service) =>
          total +
          (Number(job.serviceDetails?.[service]?.discount) || 0),
        0
      )
    }
  </p>

  <h3>
    NET AMOUNT: QAR {
      job.services?.reduce(
        (total, service) =>
          total +
          Math.max(
            (
              (Number(job.serviceDetails?.[service]?.price) || 0)
              *
              (Number(job.serviceDetails?.[service]?.quantity) || 1)
            )
            -
            (Number(job.serviceDetails?.[service]?.discount) || 0),
            0
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

  {/* ENGLISH TERMS */}

  <h1 style={{ fontSize: "20px", margin: "5px 0 10px" }}>
  Terms and Conditions
</h1>

  <h2 style={{ fontSize: "15px", margin: "8px 0 5px" }}>
  ❖ Warranty
</h2>

  <p>
    We, the Haosheng Car Care team, are pleased to offer you a warranty
    when you install full vehicle protection or full front-end protection
    (excluding misuse).
  </p>

  <p>
    • Quarter panel protection: 5-year warranty.
  </p>

  <p>
    • Protection warranty includes Nano-ceramic shine, yellowing,
    self-healing of scratches, cracking, and paint removal.
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
    • Signing the invoice or receipt by the customer is considered
    acceptance and receipt of the protection on the vehicle and cannot
    be denied or contested.
  </p>

  <p>
    • The consumer cannot obtain post-installation services during
    the warranty period for maintenance or replacement if they caused
    the damage or used inappropriate car washing materials.
  </p>

  <p>
    • The warranty does not apply to any of our products if tampered
    with or repaired, modified, or maintained by unauthorized persons.
  </p>

  <p>
    • The warranty does not cover replacement of parts damaged by severe
    scratches or accidents. Damage will be assessed by company
    technicians to determine the cost of replacement.
  </p>

  <p>
    • The customer must bring the vehicle for maintenance six days
    after protection installation.
  </p>

  <p>
    • The customer must bring the vehicle for annual maintenance and
    protection inspection. Failure to comply with the schedule voids
    the warranty.
  </p>

  <p>
    • Washing the car with materials that damage the protection,
    causing scratches or yellowing, voids the warranty.
  </p>


  <h2>
    ❖ Additional Services
  </h2>

  <p>
    • We offer car washing and protection inspection services once a
    month for a nominal fee.
  </p>


  <hr />


  {/* ARABIC TERMS */}

  <h1 dir="rtl">
    شروط و أحكام
  </h1>

  <h2 dir="rtl">
    ❖ ضمان
  </h2>

  <p dir="rtl">
    يسرّنا في فريق هاوشنغ للعناية بالسيارات أن نقدم لكم ضمانًا
    عند تركيب حماية كاملة لسيارتكم أو حماية كاملة للواجهة الأمامية
    (باستثناء سوء الاستخدام).
  </p>

  <p dir="rtl">
    • حماية ربع لوحة السيارة: ضمان 5 سنوات.
  </p>

  <p dir="rtl">
    • يشمل ضمان الحماية لمعان نانو سيراميك، والاصفرار، والمعالجة
    الذاتية للخدوش والتشققات، وإزالة الطلاء.
  </p>

  <p dir="rtl">
    • ضمان العزل الحراري: 10 سنوات.
  </p>

  
  <h2 dir="rtl">
    ❖ شروط
  </h2>

  <p dir="rtl">
    • يُعد توقيع العميل على الفاتورة أو الإيصال قبولاً واستلاماً
    للحماية على المركبة، ولا يجوز رفضه أو الاعتراض عليه.
  </p>

  <p dir="rtl">
    • لا يحق للمستهلك الحصول على خدمات ما بعد التركيب خلال فترة
    الضمان للصيانة أو الاستبدال إذا تسبب في تلف المركبة أو استخدم
    مواد غسيل غير مناسبة.
  </p>

  <p dir="rtl">
    • لا ينطبق الضمان على أي من منتجاتنا إذا تم العبث بها أو إصلاحها
    أو تعديلها أو صيانتها من قبل أشخاص غير مصرح لهم.
  </p>

  <p dir="rtl">
    • لا يغطي الضمان استبدال الأجزاء التالفة بسبب الخدوش الشديدة
    أو الحوادث. سيقوم الفريق الفني للشركة بتقييم الضرر لتحديد تكلفة الاستبدال.
  </p>

  <p dir="rtl">
    • يجب على العميل إحضار المركبة للصيانة بعد 6 أيام من تركيب الحماية.
  </p>

  <p dir="rtl">
    • يجب على العميل إحضار المركبة للصيانة السنوية وفحص الحماية.
    يُبطل الضمان عدم الالتزام بالجدول الزمني.
  </p>

  <p dir="rtl">
    • يُبطل الضمان عند غسل السيارة بمواد تُتلف الحماية، أو تُسبب خدوشاً
    أو اصفراراً.
  </p>


  <h2 dir="rtl">
    ❖ خدمات إضافية
  </h2>

  <p dir="rtl">
    نقدم خدمات غسيل السيارات وفحص الحماية مرة واحدة شهريًا مقابل
    رسوم رمزية.
  </p>


  <button
    onClick={() => window.print()}
    style={styles.printButton}
  >
    🖨 Print Invoice
  </button>

</div>




    </div>

  );

}



const styles = {

  page: {
    background: "#fff",
    padding: "10px"
  },

  invoice: {
  width: "190mm",
  height: "277mm",
  boxSizing: "border-box",
  margin: "auto",
  padding: "8px",
  fontSize: "11px",
  lineHeight: "1.15",
  pageBreakAfter: "always",
  breakAfter: "page",
},

  header: {
  width: "100%",
},

headerContent: {
  display: "flex",
  alignItems: "center",
  width: "100%",
},

logoContainer: {
  width: "25%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
},

logo: {
  width: "110px",
  height: "auto",
  display: "block",
},

companyInfo: {
  width: "75%",
  textAlign: "center",
},

  row: {
    display: "flex",
    justifyContent: "space-between"
  },

  right: {
    textAlign: "right"
  },

  amount: {
    textAlign: "right"
  },

  signatures: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "25px"
  },

  warranty: {
  width: "190mm",
  height: "277mm",
  boxSizing: "border-box",
  margin: "auto",
  padding: "10px",
  fontSize: "10px",
  lineHeight: "1.15",
  pageBreakBefore: "always",
  breakBefore: "page",
},

  table: {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
},

  cell: {
  border: "1px solid #000",
  padding: "6px",
  textAlign: "center",
  fontSize: "11px",
},

  printButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "20px"
  }

};


export default Invoice;