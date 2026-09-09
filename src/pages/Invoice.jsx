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

  async function loadJob() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
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
        <h1>Invoice Not Found</h1>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* =====================================================
          PAGE 1 - INVOICE
      ====================================================== */}

      <div style={styles.invoice}>

        {/* HEADER */}

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

              <h1 style={styles.companyTitle}>
                HAOSHENG CAR SERVICE AND ACCESSORIES
              </h1>

              <h2 style={styles.arabicCompanyTitle}>
                هاوشنغ لخدمات وزينة السيارات
              </h2>

              <p style={styles.headerText}>
                Building 358, Salwa Road, Doha - Qatar
              </p>

              <p style={styles.headerText}>
                Tel: +974 3368 1888 | C.R.NO: 199725 |
                Email: info@haoshengcar.com
              </p>

            </div>

          </div>
        </div>

        <hr />

        {/* =====================================================
            CUSTOMER / RECEIPT INFORMATION
        ====================================================== */}

        <div style={styles.row}>

          {/* LEFT SIDE */}

          <div>

            <h2 style={styles.sectionTitle}>
              INVOICE
            </h2>

            <p>
              <strong>NAME:</strong>{" "}
              {job.customer}
            </p>

            <p>
              <strong>DATE:</strong>{" "}
              {job.date}
            </p>

            <p>
              <strong>MOBILE NUMBER:</strong>{" "}
              {job.phone}
            </p>

          </div>


          {/* RIGHT SIDE */}

          <div style={styles.right}>

            <h2 style={styles.sectionTitle}>
              الفاتورة
            </h2>

            <p>
              <strong>RECEIPT NUMBER:</strong>{" "}
              {job.receipt_number}
            </p>

            <p>
              <strong>التاريخ:</strong>{" "}
              {job.date}
            </p>

            {/* PAYMENT METHOD */}

            <p>
              <strong>PAYMENT METHOD:</strong>{" "}
              {job.paymentMethod || "Not Selected"}
            </p>

            <p dir="rtl">
              <strong>طريقة الدفع:</strong>{" "}
              {job.paymentMethod || "غير محدد"}
            </p>

          </div>

        </div>

        <hr />

        {/* =====================================================
            VEHICLE INFORMATION
        ====================================================== */}

        <h2 style={styles.sectionTitle}>
          VEHICLE INFORMATION
          <br />
          معلومات المركبة
        </h2>

        <table style={styles.vehicleTable}>

          <tbody>

            <tr>

              <td style={styles.vehicleCell}>
                MAKE
              </td>

              <td style={styles.vehicleCell}>
                {job.carType}
              </td>

              <td style={styles.vehicleCell}>
                العلامة
              </td>

            </tr>


            <tr>

              <td style={styles.vehicleCell}>
                MODEL
              </td>

              <td style={styles.vehicleCell}>
                {job.carModel}
              </td>

              <td style={styles.vehicleCell}>
                النوع
              </td>

            </tr>


            <tr>

              <td style={styles.vehicleCell}>
                COLOR
              </td>

              <td style={styles.vehicleCell}>
                {job.color}
              </td>

              <td style={styles.vehicleCell}>
                اللون
              </td>

            </tr>


            <tr>

              <td style={styles.vehicleCell}>
                CHASSIS
              </td>

              <td style={styles.vehicleCell}>
                {job.chassis}
              </td>

              <td style={styles.vehicleCell}>
                الهيكل
              </td>

            </tr>


            <tr>

              <td style={styles.vehicleCell}>
                PLATE
              </td>

              <td style={styles.vehicleCell}>
                {job.plate}
              </td>

              <td style={styles.vehicleCell}>
                اللوحة
              </td>

            </tr>

          </tbody>

        </table>

        <hr />

        {/* =====================================================
            SERVICES
        ====================================================== */}

        <h2 style={styles.sectionTitle}>
          SERVICE OFFERED
          <br />
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

            {job.services?.map((service, index) => {

              const details =
                job.serviceDetails?.[service];

              const price =
                Number(details?.price) || 0;

              const quantity =
                Number(details?.quantity) || 1;

              const discount =
                Number(details?.discount) || 0;

              const total =
                Math.max(
                  price * quantity - discount,
                  0
                );

              return (

                <tr key={index}>

                  {/* SERVICE */}

                  <td style={styles.cell}>
                    {service}
                  </td>


                  {/* PRICE */}

                  <td style={styles.cell}>
                    QAR {price}
                  </td>


                  {/* QUANTITY */}

                  <td style={styles.cell}>
                    {quantity}
                  </td>


                  {/* DISCOUNT */}

                  <td style={styles.cell}>
                    QAR {discount}
                  </td>


                  {/* TOTAL */}

                  <td style={styles.cell}>
                    QAR {total}
                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>


        <br />


        {/* =====================================================
            TOTAL AMOUNTS
        ====================================================== */}

        <div style={styles.amount}>

          {/* TOTAL BEFORE DISCOUNT */}

          <p>

            <strong>
              TOTAL AMOUNT: QAR{" "}
            </strong>

            {job.services?.reduce(
              (total, service) => {

                const details =
                  job.serviceDetails?.[service];

                const price =
                  Number(details?.price) || 0;

                const quantity =
                  Number(details?.quantity) || 1;

                return (
                  total +
                  price * quantity
                );

              },
              0
            )}

          </p>


          {/* DISCOUNT */}

          <p>

            <strong>
              DISCOUNT: QAR{" "}
            </strong>

            {job.services?.reduce(
              (total, service) => {

                const discount =
                  Number(
                    job.serviceDetails?.[service]?.discount
                  ) || 0;

                return total + discount;

              },
              0
            )}

          </p>


          {/* NET AMOUNT */}

          <h3>

            NET AMOUNT: QAR{" "}

            {job.services?.reduce(
              (total, service) => {

                const details =
                  job.serviceDetails?.[service];

                const price =
                  Number(details?.price) || 0;

                const quantity =
                  Number(details?.quantity) || 1;

                const discount =
                  Number(details?.discount) || 0;

                return (
                  total +
                  Math.max(
                    price * quantity - discount,
                    0
                  )
                );

              },
              0
            )}

          </h3>

        </div>

        <hr />


        {/* =====================================================
            VOUCHER
        ====================================================== */}

        {job.voucherNumber && (

          <p>

            <strong>
              TEYSEER MOTORS VOUCHER:
            </strong>{" "}

            {job.voucherNumber}

          </p>

        )}


        {/* =====================================================
            PPF WARRANTY
        ====================================================== */}

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
          1X FREE AFTER HALF YEAR PPF CHEMICAL
          SERVICE PROTECTION
        </p>

        <p dir="rtl">
          بعد نصف سنة تحصل على سيرفس للحماية مجاني
          لمرة واحدة
        </p>


        {/* =====================================================
            SIGNATURES
        ====================================================== */}

        <div style={styles.signatures}>

          <div>

            <p>
              CUSTOMER'S SIGNATURE
            </p>

            <br />

            ______________________

          </div>


          <div>

            <p>
              AUTHORIZED SIGNATURE
            </p>

            <br />

            ______________________

          </div>

        </div>

      </div>


      {/* =====================================================
          PAGE 2 - TERMS AND CONDITIONS
      ====================================================== */}

      <div style={styles.warranty}>

        {/* =====================================================
            ENGLISH TERMS
        ====================================================== */}

        <h1 style={styles.termsTitle}>
          Terms and Conditions
        </h1>


        <h2 style={styles.termsHeading}>
          ❖ Warranty
        </h2>


        <p>
          We, the Haosheng Car Care team, are pleased
          to offer you a warranty when you install full
          vehicle protection or full front-end protection
          (excluding misuse).
        </p>


        <p>
          • Quarter panel protection: 5-year warranty.
        </p>


        <p>
          • Protection warranty includes Nano-ceramic
          shine, yellowing, self-healing of scratches,
          cracking, and paint removal.
        </p>


        <p>
          • Thermal insulation warranty: 10 years.
        </p>


        <p>
          • Nano-ceramic service: 2 years for shine,
          6 months for water repellency.
        </p>


        <h2 style={styles.termsHeading}>
          ❖ Conditions
        </h2>


        <p>
          • Signing the invoice or receipt by the
          customer is considered acceptance and receipt
          of the protection on the vehicle and cannot
          be denied or contested.
        </p>


        <p>
          • The consumer cannot obtain post-installation
          services during the warranty period for
          maintenance or replacement if they caused the
          damage or used inappropriate car washing
          materials.
        </p>


        <p>
          • The warranty does not apply to any of our
          products if tampered with or repaired,
          modified, or maintained by unauthorized
          persons.
        </p>


        <p>
          • The warranty does not cover replacement of
          parts damaged by severe scratches or accidents.
          Damage will be assessed by company technicians
          to determine the cost of replacement.
        </p>


        <p>
          • The customer must bring the vehicle for
          maintenance six days after protection
          installation.
        </p>


        <p>
          • The customer must bring the vehicle for
          annual maintenance and protection inspection.
          Failure to comply with the schedule voids the
          warranty.
        </p>


        <p>
          • Washing the car with materials that damage
          the protection, causing scratches or yellowing,
          voids the warranty.
        </p>


        <h2 style={styles.termsHeading}>
          ❖ Additional Services
        </h2>


        <p>
          • We offer car washing and protection
          inspection services once a month for a
          nominal fee.
        </p>


        <hr />


        {/* =====================================================
            ARABIC TERMS
        ====================================================== */}

        <h1
          dir="rtl"
          style={styles.termsTitle}
        >
          شروط و أحكام
        </h1>


        <h2
          dir="rtl"
          style={styles.termsHeading}
        >
          ❖ ضمان
        </h2>


        <p dir="rtl">
          يسرّنا في فريق هاوشنغ للعناية بالسيارات أن
          نقدم لكم ضمانًا عند تركيب حماية كاملة
          لسيارتكم أو حماية كاملة للواجهة الأمامية
          (باستثناء سوء الاستخدام).
        </p>


        <p dir="rtl">
          • حماية ربع لوحة السيارة: ضمان 5 سنوات.
        </p>


        <p dir="rtl">
          • يشمل ضمان الحماية لمعان نانو سيراميك،
          والاصفرار، والمعالجة الذاتية للخدوش
          والتشققات، وإزالة الطلاء.
        </p>


        <p dir="rtl">
          • ضمان العزل الحراري: 10 سنوات.
        </p>


        <p dir="rtl">
          • خدمة نانو سيراميك: سنتان للمعان،
          و6 أشهر لمقاومة الماء.
        </p>


        <h2
          dir="rtl"
          style={styles.termsHeading}
        >
          ❖ شروط
        </h2>


        <p dir="rtl">
          • يُعد توقيع العميل على الفاتورة أو الإيصال
          قبولاً واستلاماً للحماية على المركبة، ولا
          يجوز رفضه أو الاعتراض عليه.
        </p>


        <p dir="rtl">
          • لا يحق للمستهلك الحصول على خدمات ما بعد
          التركيب خلال فترة الضمان للصيانة أو الاستبدال
          إذا تسبب في تلف المركبة أو استخدم مواد غسيل
          غير مناسبة.
        </p>


        <p dir="rtl">
          • لا ينطبق الضمان على أي من منتجاتنا إذا تم
          العبث بها أو إصلاحها أو تعديلها أو صيانتها من
          قبل أشخاص غير مصرح لهم.
        </p>


        <p dir="rtl">
          • لا يغطي الضمان استبدال الأجزاء التالفة بسبب
          الخدوش الشديدة أو الحوادث. سيقوم الفريق الفني
          للشركة بتقييم الضرر لتحديد تكلفة الاستبدال.
        </p>


        <p dir="rtl">
          • يجب على العميل إحضار المركبة للصيانة بعد
          6 أيام من تركيب الحماية.
        </p>


        <p dir="rtl">
          • يجب على العميل إحضار المركبة للصيانة السنوية
          وفحص الحماية. يُبطل الضمان عدم الالتزام
          بالجدول الزمني.
        </p>


        <p dir="rtl">
          • يُبطل الضمان عند غسل السيارة بمواد تُتلف
          الحماية، أو تُسبب خدوشاً أو اصفراراً.
        </p>


        <h2
          dir="rtl"
          style={styles.termsHeading}
        >
          ❖ خدمات إضافية
        </h2>


        <p dir="rtl">
          نقدم خدمات غسيل السيارات وفحص الحماية مرة
          واحدة شهريًا مقابل رسوم رمزية.
        </p>


        {/* =====================================================
            PRINT BUTTON
        ====================================================== */}

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


/* =========================================================
   STYLES
========================================================= */

const styles = {

  page: {
    background: "#fff",
    padding: "10px",
  },


  /* PAGE 1 */

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


  /* HEADER */

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


  companyTitle: {
    fontSize: "20px",
    margin: "4px 0",
  },


  arabicCompanyTitle: {
    fontSize: "17px",
    margin: "4px 0",
  },


  headerText: {
    margin: "3px 0",
  },


  /* CUSTOMER AREA */

  row: {
    display: "flex",
    justifyContent: "space-between",
  },


  right: {
    textAlign: "right",
  },


  sectionTitle: {
    fontSize: "16px",
    margin: "8px 0",
  },


  /* VEHICLE TABLE */

  vehicleTable: {
    width: "100%",
    borderCollapse: "collapse",
  },


  vehicleCell: {
    border: "1px solid #000",
    padding: "6px",
    textAlign: "center",
    fontSize: "11px",
  },


  /* SERVICE TABLE */

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


  /* TOTALS */

  amount: {
    textAlign: "right",
  },


  /* SIGNATURES */

  signatures: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
  },


  /* PAGE 2 */

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


  termsTitle: {
    fontSize: "20px",
    margin: "5px 0 10px",
  },


  termsHeading: {
    fontSize: "15px",
    margin: "8px 0 5px",
  },


  /* PRINT BUTTON */

  printButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "20px",
  },

};


/* =========================================================
   PRINT CSS
========================================================= */

if (typeof document !== "undefined") {

  const printStyle = document.createElement("style");

  printStyle.innerHTML = `

    @media print {

      @page {
        size: A4;
        margin: 8mm;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }

      button {
        display: none !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .invoice {
        page-break-after: always;
        break-after: page;
      }

      .warranty {
        page-break-before: always;
        break-before: page;
      }

      table {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }

    }

  `;

  document.head.appendChild(printStyle);
}


export default Invoice;