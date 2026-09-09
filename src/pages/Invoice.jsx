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
  }, [id]);

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
      <div style={styles.loading}>
        <h2>Loading Invoice...</h2>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={styles.loading}>
        <h2>Invoice Not Found</h2>
      </div>
    );
  }

  /* =========================================================
     CALCULATE TOTALS
  ========================================================= */

  const totalAmount =
    job.services?.reduce((total, service) => {
      const details = job.serviceDetails?.[service];

      const price = Number(details?.price) || 0;
      const quantity = Number(details?.quantity) || 1;

      return total + price * quantity;
    }, 0) || 0;

  const totalDiscount =
    job.services?.reduce((total, service) => {
      const discount =
        Number(job.serviceDetails?.[service]?.discount) || 0;

      return total + discount;
    }, 0) || 0;

  const netAmount =
    job.services?.reduce((total, service) => {
      const details = job.serviceDetails?.[service];

      const price = Number(details?.price) || 0;
      const quantity = Number(details?.quantity) || 1;
      const discount = Number(details?.discount) || 0;

      return total + Math.max(price * quantity - discount, 0);
    }, 0) || 0;

  return (
    <div style={styles.page}>

      {/* =====================================================
          PAGE 1 - INVOICE
      ====================================================== */}

      <section
        className="invoice-page"
        style={styles.invoice}
      >

        {/* TOP BAR */}

        <div style={styles.topBar}></div>


        {/* =================================================
            COMPANY HEADER
        ================================================== */}

        <header style={styles.header}>

          <div style={styles.logoArea}>

            <img
              src={gaLogo}
              alt="GA Logo"
              style={styles.logo}
            />

          </div>


          <div style={styles.companyInfo}>

            <h1 style={styles.companyName}>
              HAOSHENG
              <br />
              CAR SERVICE AND ACCESSORIES
            </h1>

            <h2 style={styles.companyArabic}>
              هاوشنغ لخدمات وزينة السيارات
            </h2>

            <p style={styles.address}>
              Building 358, Salwa Road, Doha - Qatar
            </p>

            <p style={styles.contact}>
              Tel: +974 3368 1888
              <span style={styles.separator}>|</span>
              C.R.NO: 199725
              <span style={styles.separator}>|</span>
              info@haoshengcar.com
            </p>

          </div>


          <div style={styles.invoiceBadge}>

            <div style={styles.invoiceLabel}>
              INVOICE
            </div>

            <div style={styles.invoiceArabic}>
              الفاتورة
            </div>

            <div style={styles.receiptNumber}>
              #{job.receipt_number || "N/A"}
            </div>

          </div>

        </header>


        {/* =================================================
            CUSTOMER / PAYMENT INFORMATION
        ================================================== */}

        <div style={styles.infoGrid}>

          {/* CUSTOMER */}

          <div style={styles.infoCard}>

            <div style={styles.cardHeader}>
              CUSTOMER INFORMATION
            </div>

            <div style={styles.cardBody}>

              <div style={styles.infoRow}>

                <span style={styles.infoLabel}>
                  CUSTOMER NAME
                </span>

                <span style={styles.infoValue}>
                  {job.customer || "-"}
                </span>

              </div>


              <div style={styles.infoRow}>

                <span style={styles.infoLabel}>
                  MOBILE NUMBER
                </span>

                <span style={styles.infoValue}>
                  {job.phone || "-"}
                </span>

              </div>


              <div style={styles.infoRow}>

                <span style={styles.infoLabel}>
                  INVOICE DATE
                </span>

                <span style={styles.infoValue}>
                  {job.date || "-"}
                </span>

              </div>

            </div>

          </div>


          {/* PAYMENT */}

          <div style={styles.infoCard}>

            <div style={styles.cardHeader}>
              PAYMENT INFORMATION
            </div>

            <div style={styles.cardBody}>

              <div style={styles.infoRow}>

                <span style={styles.infoLabel}>
                  PAYMENT METHOD
                </span>

                <span style={styles.paymentValue}>
                  {job.payment_method || "Not Selected"}
                </span>

              </div>


              <div style={styles.infoRow}>

                <span
                  style={styles.infoLabel}
                  dir="rtl"
                >
                  طريقة الدفع
                </span>

                <span
                  style={styles.paymentValue}
                  dir="rtl"
                >
                  {job.payment_method || "غير محدد"}
                </span>

              </div>


              {job.voucherNumber && (

                <div style={styles.infoRow}>

                  <span style={styles.infoLabel}>
                    VOUCHER NUMBER
                  </span>

                  <span style={styles.infoValue}>
                    {job.voucherNumber}
                  </span>

                </div>

              )}

            </div>

          </div>

        </div>


        {/* =================================================
            VEHICLE INFORMATION
        ================================================== */}

        <div style={styles.sectionHeading}>

          <div>
            VEHICLE INFORMATION
          </div>

          <div style={styles.sectionArabic}>
            معلومات المركبة
          </div>

        </div>


        <div style={styles.vehicleGrid}>

          <div style={styles.vehicleItem}>

            <span style={styles.vehicleLabel}>
              MAKE
            </span>

            <strong style={styles.vehicleValue}>
              {job.carType || "-"}
            </strong>

            <small style={styles.vehicleArabic}>
              العلامة
            </small>

          </div>


          <div style={styles.vehicleItem}>

            <span style={styles.vehicleLabel}>
              MODEL
            </span>

            <strong style={styles.vehicleValue}>
              {job.carModel || "-"}
            </strong>

            <small style={styles.vehicleArabic}>
              النوع
            </small>

          </div>


          <div style={styles.vehicleItem}>

            <span style={styles.vehicleLabel}>
              COLOR
            </span>

            <strong style={styles.vehicleValue}>
              {job.color || "-"}
            </strong>

            <small style={styles.vehicleArabic}>
              اللون
            </small>

          </div>


          <div style={styles.vehicleItem}>

            <span style={styles.vehicleLabel}>
              CHASSIS
            </span>

            <strong style={styles.vehicleValue}>
              {job.chassis || "-"}
            </strong>

            <small style={styles.vehicleArabic}>
              الهيكل
            </small>

          </div>


          <div
            style={{
              ...styles.vehicleItem,
              borderRight: "none",
            }}
          >

            <span style={styles.vehicleLabel}>
              PLATE
            </span>

            <strong style={styles.vehicleValue}>
              {job.plate || "-"}
            </strong>

            <small style={styles.vehicleArabic}>
              اللوحة
            </small>

          </div>

        </div>


        {/* =================================================
            SERVICES
        ================================================== */}

        <div style={styles.sectionHeading}>

          <div>
            SERVICE OFFERED
          </div>

          <div style={styles.sectionArabic}>
            الخدمة المقدمة
          </div>

        </div>


        <table style={styles.serviceTable}>

          <thead>

            <tr>

              <th style={styles.serviceHeader}>
                SERVICE
              </th>

              <th style={styles.serviceHeader}>
                PRICE
              </th>

              <th style={styles.serviceHeader}>
                QTY
              </th>

              <th style={styles.serviceHeader}>
                DISCOUNT
              </th>

              <th style={styles.serviceHeader}>
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

                  <td style={styles.serviceCell}>
                    {service}
                  </td>

                  <td style={styles.serviceCell}>
                    QAR {price.toFixed(2)}
                  </td>

                  <td style={styles.serviceCell}>
                    {quantity}
                  </td>

                  <td style={styles.serviceCell}>
                    QAR {discount.toFixed(2)}
                  </td>

                  <td
                    style={{
                      ...styles.serviceCell,
                      fontWeight: "700",
                    }}
                  >
                    QAR {total.toFixed(2)}
                  </td>

                </tr>

              );

            })}


            {(!job.services ||
              job.services.length === 0) && (

              <tr>

                <td
                  colSpan="5"
                  style={styles.emptyCell}
                >
                  No services added
                </td>

              </tr>

            )}

          </tbody>

        </table>


        {/* =================================================
            TOTALS
        ================================================== */}

        <div style={styles.totalArea}>

          <div style={styles.totalBox}>

            <div style={styles.totalRow}>

              <span>
                TOTAL AMOUNT
              </span>

              <strong>
                QAR {totalAmount.toFixed(2)}
              </strong>

            </div>


            <div style={styles.totalRow}>

              <span>
                DISCOUNT
              </span>

              <strong>
                QAR {totalDiscount.toFixed(2)}
              </strong>

            </div>


            <div style={styles.netRow}>

              <span>
                NET AMOUNT
              </span>

              <strong>
                QAR {netAmount.toFixed(2)}
              </strong>

            </div>

          </div>

        </div>


        {/* =================================================
            PAYMENT SUMMARY
        ================================================== */}

        <div style={styles.paymentSummary}>

          <span>
            PAYMENT METHOD
          </span>

          <strong>
            {job.payment_method || "Not Selected"}
          </strong>

        </div>


        {/* =================================================
            PPF WARRANTY
        ================================================== */}

        <div style={styles.ppfBox}>

          <div style={styles.ppfTitle}>
            PPF WARRANTY
          </div>

          <div style={styles.ppfContent}>

            <div>
              <strong>8 YEARS</strong>
            </div>

            <div>
              FREE CHECK UP AFTER 1 WEEK FOR PPF
            </div>

            <div dir="rtl">
              فحص مجاني بعد أسبوع واحد لـ PPF
            </div>

            <div>
              1X FREE AFTER HALF YEAR PPF
              CHEMICAL SERVICE PROTECTION
            </div>

            <div dir="rtl">
              بعد نصف سنة تحصل على سيرفس للحماية
              مجاني لمرة واحدة
            </div>

          </div>

        </div>


        {/* =================================================
            SIGNATURES
        ================================================== */}

        <div style={styles.signatureArea}>

          <div style={styles.signatureBox}>

            <div style={styles.signatureTitle}>
              CUSTOMER'S SIGNATURE
            </div>

            <div style={styles.signatureLine}></div>

            <div style={styles.signatureSub}>
              توقيع العميل
            </div>

          </div>


          <div style={styles.signatureBox}>

            <div style={styles.signatureTitle}>
              AUTHORIZED SIGNATURE
            </div>

            <div style={styles.signatureLine}></div>

            <div style={styles.signatureSub}>
              التوقيع المعتمد
            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div style={styles.footer}>
          Thank you for choosing Haosheng Car Care
        </div>

      </section>


      {/* =====================================================
          PAGE 2 - TERMS AND CONDITIONS
      ====================================================== */}

      <section
        className="terms-page"
        style={styles.termsPage}
      >

        <div style={styles.topBar}></div>


        {/* TERMS HEADER */}

        <div style={styles.termsHeader}>

          <img
            src={gaLogo}
            alt="GA Logo"
            style={styles.termsLogo}
          />

          <div>

            <h1 style={styles.termsMainTitle}>
              TERMS AND CONDITIONS
            </h1>

            <h2 style={styles.termsArabicTitle}>
              شروط و أحكام
            </h2>

          </div>

        </div>


        <div style={styles.termsDivider}></div>


        {/* =================================================
            ENGLISH TERMS
        ================================================== */}

        <div style={styles.termsSection}>

          <h2 style={styles.termsHeading}>
            ❖ WARRANTY
          </h2>


          <p style={styles.termsParagraph}>
            We, the Haosheng Car Care team, are pleased
            to offer you a warranty when you install full
            vehicle protection or full front-end protection
            (excluding misuse).
          </p>


          <p style={styles.termsParagraph}>
            • Quarter panel protection: 5-year warranty.
          </p>


          <p style={styles.termsParagraph}>
            • Protection warranty includes Nano-ceramic
            shine, yellowing, self-healing of scratches,
            cracking, and paint removal.
          </p>


          <p style={styles.termsParagraph}>
            • Thermal insulation warranty: 10 years.
          </p>


          <p style={styles.termsParagraph}>
            • Nano-ceramic service: 2 years for shine,
            6 months for water repellency.
          </p>


          <h2 style={styles.termsHeading}>
            ❖ CONDITIONS
          </h2>


          <p style={styles.termsParagraph}>
            • Signing the invoice or receipt by the
            customer is considered acceptance and receipt
            of the protection on the vehicle and cannot
            be denied or contested.
          </p>


          <p style={styles.termsParagraph}>
            • The consumer cannot obtain post-installation
            services during the warranty period for
            maintenance or replacement if they caused
            the damage or used inappropriate car washing
            materials.
          </p>


          <p style={styles.termsParagraph}>
            • The warranty does not apply to any of our
            products if tampered with or repaired,
            modified, or maintained by unauthorized
            persons.
          </p>


          <p style={styles.termsParagraph}>
            • The warranty does not cover replacement of
            parts damaged by severe scratches or accidents.
            Damage will be assessed by company technicians
            to determine the cost of replacement.
          </p>


          <p style={styles.termsParagraph}>
            • The customer must bring the vehicle for
            maintenance six days after protection
            installation.
          </p>


          <p style={styles.termsParagraph}>
            • The customer must bring the vehicle for
            annual maintenance and protection inspection.
            Failure to comply with the schedule voids the
            warranty.
          </p>


          <p style={styles.termsParagraph}>
            • Washing the car with materials that damage
            the protection, causing scratches or yellowing,
            voids the warranty.
          </p>


          <h2 style={styles.termsHeading}>
            ❖ ADDITIONAL SERVICES
          </h2>


          <p style={styles.termsParagraph}>
            • We offer car washing and protection
            inspection services once a month for a
            nominal fee.
          </p>

        </div>


        <div style={styles.termsDivider}></div>


        {/* =================================================
            ARABIC TERMS
        ================================================== */}

        <div
          style={styles.arabicTerms}
          dir="rtl"
        >

          <h2 style={styles.arabicTermsHeading}>
            ❖ ضمان
          </h2>


          <p style={styles.termsParagraph}>
            يسرّنا في فريق هاوشنغ للعناية بالسيارات أن
            نقدم لكم ضمانًا عند تركيب حماية كاملة
            لسيارتكم أو حماية كاملة للواجهة الأمامية
            (باستثناء سوء الاستخدام).
          </p>


          <p style={styles.termsParagraph}>
            • حماية ربع لوحة السيارة: ضمان 5 سنوات.
          </p>


          <p style={styles.termsParagraph}>
            • يشمل ضمان الحماية لمعان نانو سيراميك،
            والاصفرار، والمعالجة الذاتية للخدوش
            والتشققات، وإزالة الطلاء.
          </p>


          <p style={styles.termsParagraph}>
            • ضمان العزل الحراري: 10 سنوات.
          </p>


          <p style={styles.termsParagraph}>
            • خدمة نانو سيراميك: سنتان للمعان،
            و6 أشهر لمقاومة الماء.
          </p>


          <h2 style={styles.arabicTermsHeading}>
            ❖ شروط
          </h2>


          <p style={styles.termsParagraph}>
            • يُعد توقيع العميل على الفاتورة أو الإيصال
            قبولاً واستلاماً للحماية على المركبة، ولا
            يجوز رفضه أو الاعتراض عليه.
          </p>


          <p style={styles.termsParagraph}>
            • لا يحق للمستهلك الحصول على خدمات ما بعد
            التركيب خلال فترة الضمان للصيانة أو الاستبدال
            إذا تسبب في تلف المركبة أو استخدم مواد غسيل
            غير مناسبة.
          </p>


          <p style={styles.termsParagraph}>
            • لا ينطبق الضمان على أي من منتجاتنا إذا تم
            العبث بها أو إصلاحها أو تعديلها أو صيانتها
            من قبل أشخاص غير مصرح لهم.
          </p>


          <p style={styles.termsParagraph}>
            • لا يغطي الضمان استبدال الأجزاء التالفة بسبب
            الخدوش الشديدة أو الحوادث. سيقوم الفريق الفني
            للشركة بتقييم الضرر لتحديد تكلفة الاستبدال.
          </p>


          <p style={styles.termsParagraph}>
            • يجب على العميل إحضار المركبة للصيانة بعد
            6 أيام من تركيب الحماية.
          </p>


          <p style={styles.termsParagraph}>
            • يجب على العميل إحضار المركبة للصيانة السنوية
            وفحص الحماية. يُبطل الضمان عدم الالتزام
            بالجدول الزمني.
          </p>


          <p style={styles.termsParagraph}>
            • يُبطل الضمان عند غسل السيارة بمواد تُتلف
            الحماية، أو تُسبب خدوشاً أو اصفراراً.
          </p>


          <h2 style={styles.arabicTermsHeading}>
            ❖ خدمات إضافية
          </h2>


          <p style={styles.termsParagraph}>
            نقدم خدمات غسيل السيارات وفحص الحماية مرة
            واحدة شهريًا مقابل رسوم رمزية.
          </p>

        </div>


        {/* TERMS FOOTER */}

        <div style={styles.termsFooter}>
          HAOSHENG CAR SERVICE AND ACCESSORIES
          <br />
          Doha - Qatar
        </div>


        {/* PRINT BUTTON */}

        <button
          className="print-button"
          onClick={() => window.print()}
          style={styles.printButton}
        >
          🖨 Print Invoice
        </button>

      </section>

    </div>
  );
}


/* =========================================================
   COLORS
========================================================= */

const colors = {
  navy: "#060A0F",
  blue: "#1D4E89",
  lightBlue: "#EAF2F8",
  gold: "#C79A45",
  lightGold: "#F8F1E4",
  dark: "#20252B",
  gray: "#667085",
  lightGray: "#F5F7FA",
  border: "#D8DEE6",
  white: "#FFFFFF",
  black: "#000000",
};


/* =========================================================
   STYLES
========================================================= */

const styles = {

  page: {
    background: "#E9EDF2",
    minHeight: "100vh",
    padding: "20px 0",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: colors.dark,
  },


  loading: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },


  /* =====================================================
     PAGE 1
  ====================================================== */

  invoice: {
    width: "190mm",
    height: "277mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto 20px",
    padding: "7mm",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
  },


  topBar: {
    height: "5px",
    width: "100%",
    background:
      `linear-gradient(90deg, ${colors.navy} 0%, ${colors.navy} 65%, ${colors.gold} 65%, ${colors.gold} 100%)`,
    marginBottom: "10px",
  },


  /* =====================================================
     HEADER
  ====================================================== */

  header: {
    display: "grid",
    gridTemplateColumns: "23% 57% 20%",
    alignItems: "center",
    minHeight: "95px",
  },


  logoArea: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "5px",
  },


  logo: {
    width: "95px",
    maxHeight: "80px",
    objectFit: "contain",
  },


  companyInfo: {
    textAlign: "center",
    padding: "0 5px",
  },


  companyName: {
    color: colors.black,
    fontSize: "17px",
    lineHeight: "1.05",
    margin: "0 0 4px",
    fontWeight: "800",
    letterSpacing: "0.3px",
  },


  companyArabic: {
    color: colors.gold,
    fontSize: "15px",
    margin: "3px 0 5px",
    fontWeight: "700",
  },


  address: {
    fontSize: "8px",
    margin: "2px 0",
    color: colors.gray,
  },


  contact: {
    fontSize: "7.5px",
    margin: "2px 0",
    color: colors.gray,
  },


  separator: {
    margin: "0 3px",
    color: colors.gold,
    fontWeight: "bold",
  },


  invoiceBadge: {
    background: colors.lightGold,
    color: colors.black,
    padding: "10px 7px",
    textAlign: "center",
    borderRadius: "4px",
    borderBottom: `4px solid ${colors.gold}`,
  },


  invoiceLabel: {
    fontSize: "15px",
    fontWeight: "800",
    letterSpacing: "1px",
  },


  invoiceArabic: {
    fontSize: "12px",
    marginTop: "2px",
  },


  receiptNumber: {
    fontSize: "9px",
    marginTop: "6px",
    color: colors.dark,
  },


  /* =====================================================
     CUSTOMER / PAYMENT
  ====================================================== */

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "8px",
  },


  infoCard: {
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    overflow: "hidden",
  },


  cardHeader: {
    background: colors.lightBlue,
    color: colors.black,
    fontSize: "8px",
    fontWeight: "800",
    letterSpacing: "0.6px",
    padding: "5px 8px",
    borderBottom: `2px solid ${colors.gold}`,
  },


  cardBody: {
    padding: "5px 8px",
  },


  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
    borderBottom: "1px solid #EEF1F4",
    gap: "8px",
  },


  infoLabel: {
    fontSize: "7.5px",
    color: colors.gray,
    fontWeight: "700",
  },


  infoValue: {
    fontSize: "8.5px",
    fontWeight: "700",
    textAlign: "right",
  },


  paymentValue: {
    fontSize: "9px",
    fontWeight: "800",
    color: colors.blue,
    textAlign: "right",
    background: colors.lightGold,
    padding: "3px 7px",
    borderRadius: "3px",
  },


  /* =====================================================
     SECTION HEADINGS
  ====================================================== */

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "9px",
    marginBottom: "5px",
    padding: "5px 8px",
    background: colors.navy,
    color: colors.white,
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "0.7px",
    borderLeft: `4px solid ${colors.gold}`,
  },


  sectionArabic: {
    fontSize: "9px",
    color: "#E8D4A9",
  },


  /* =====================================================
     VEHICLE
  ====================================================== */

  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    border: `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden",
  },


  vehicleItem: {
    minHeight: "44px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "4px",
    borderRight: `1px solid ${colors.border}`,
    background: "#FCFDFE",
    textAlign: "center",
  },


  vehicleLabel: {
    fontSize: "6.5px",
    color: colors.gray,
    fontWeight: "800",
    letterSpacing: "0.6px",
    marginBottom: "3px",
  },


  vehicleValue: {
    fontSize: "8.5px",
  },


  vehicleArabic: {
    fontSize: "6.5px",
    marginTop: "2px",
    color: colors.gray,
  },


  /* =====================================================
     SERVICE TABLE
  ====================================================== */

  serviceTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "8px",
  },


  serviceHeader: {
    background: colors.black,
    color: colors.gold,
    border: `1px solid ${colors.navy}`,
    padding: "6px 4px",
    textAlign: "center",
    fontSize: "7.5px",
    letterSpacing: "0.5px",
  },


  serviceCell: {
    border: `1px solid ${colors.border}`,
    padding: "5px 4px",
    textAlign: "center",
    fontSize: "8px",
  },


  emptyCell: {
    border: `1px solid ${colors.border}`,
    padding: "10px",
    textAlign: "center",
    color: colors.gray,
  },


  /* =====================================================
     TOTALS
  ====================================================== */

  totalArea: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "8px",
  },


  totalBox: {
    width: "46%",
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    overflow: "hidden",
  },


  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 8px",
    fontSize: "8px",
    borderBottom: `1px solid ${colors.border}`,
  },


  netRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "7px 8px",
    background: colors.black,
    color: colors.gold,
    fontSize: "9px",
    fontWeight: "800",
  },


  /* =====================================================
     PAYMENT SUMMARY
  ====================================================== */

  paymentSummary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "7px",
    padding: "7px 10px",
    background: colors.lightBlue,
    border: `1px solid ${colors.border}`,
    borderLeft: `4px solid ${colors.gold}`,
    borderRadius: "4px",
    fontSize: "9px",
    fontWeight: "700",
  },


  /* =====================================================
     PPF
  ====================================================== */

  ppfBox: {
    marginTop: "8px",
    border: `1px solid ${colors.gold}`,
    borderRadius: "4px",
    overflow: "hidden",
  },


  ppfTitle: {
    background: colors.lightGold,
    color: colors.navy,
    fontSize: "8px",
    fontWeight: "800",
    padding: "5px 8px",
    borderBottom: `1px solid ${colors.gold}`,
  },


  ppfContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2px 12px",
    padding: "6px 8px",
    fontSize: "7.5px",
    lineHeight: "1.25",
  },


  /* =====================================================
     SIGNATURES
  ====================================================== */

  signatureArea: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "70px",
    marginTop: "13px",
  },


  signatureBox: {
    textAlign: "center",
  },


  signatureTitle: {
    fontSize: "7.5px",
    color: colors.navy,
    fontWeight: "800",
  },


  signatureLine: {
    borderBottom: `1px solid ${colors.dark}`,
    marginTop: "24px",
  },


  signatureSub: {
    fontSize: "7px",
    color: colors.gray,
    marginTop: "3px",
  },


  /* =====================================================
     FOOTER
  ====================================================== */

  footer: {
    position: "absolute",
    bottom: "6mm",
    left: "7mm",
    right: "7mm",
    textAlign: "center",
    fontSize: "7px",
    color: colors.gray,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "4px",
  },


  /* =====================================================
     PAGE 2
  ====================================================== */

  termsPage: {
    width: "190mm",
    height: "277mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto",
    padding: "7mm",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    fontSize: "9px",
    lineHeight: "1.25",
  },


  termsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "2px 5px 6px",
  },


  termsLogo: {
    width: "60px",
    height: "48px",
    objectFit: "contain",
  },


  termsMainTitle: {
    margin: "0",
    fontSize: "19px",
    color: colors.gold,
    letterSpacing: "0.8px",
  },


  termsArabicTitle: {
    margin: "3px 0 0",
    fontSize: "14px",
    color: colors.gold,
  },


  termsDivider: {
    height: "2px",
    background:
      `linear-gradient(90deg, ${colors.black}, ${colors.gold})`,
    margin: "3px 0 7px",
  },


  termsSection: {
    padding: "0 4px",
  },


  termsHeading: {
    color: colors.gold,
    fontSize: "12px",
    fontWeight: "800",
    margin: "6px 0 3px",
    borderLeft: `3px solid ${colors.gold}`,
    paddingLeft: "6px",
  },


  arabicTerms: {
    padding: "0 4px",
    textAlign: "right",
  },


  arabicTermsHeading: {
    color: colors.gold,
    fontSize: "12px",
    fontWeight: "800",
    margin: "6px 0 3px",
    borderRight: `3px solid ${colors.gold}`,
    paddingRight: "6px",
  },


  termsParagraph: {
    margin: "3px 0",
    fontSize: "7.8px",
  },


  termsFooter: {
    position: "absolute",
    bottom: "6mm",
    left: "7mm",
    right: "7mm",
    textAlign: "center",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "4px",
    fontSize: "6.5px",
    color: colors.gray,
  },


  /* =====================================================
     PRINT BUTTON
  ====================================================== */

  printButton: {
    position: "fixed",
    right: "25px",
    bottom: "25px",
    background: colors.gold,
    color: colors.white,
    border: "none",
    padding: "13px 24px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    zIndex: 9999,
  },

};


/* =========================================================
   PRINT CSS
========================================================= */

if (typeof document !== "undefined") {

  const existingStyle =
    document.getElementById(
      "professional-invoice-print-style"
    );

  if (!existingStyle) {

    const printStyle =
      document.createElement("style");

    printStyle.id =
      "professional-invoice-print-style";

    printStyle.innerHTML = `

      * {
        box-sizing: border-box;
      }

      @media print {

        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          width: 210mm !important;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .print-button {
          display: none !important;
        }

        .invoice-page {
          width: 210mm !important;
          height: 297mm !important;

          margin: 0 !important;

          padding: 10mm !important;

          box-shadow: none !important;

          overflow: hidden !important;

          page-break-after: always !important;
          break-after: page !important;
        }

        .terms-page {
          width: 210mm !important;
          height: 297mm !important;

          margin: 0 !important;

          padding: 10mm !important;

          box-shadow: none !important;

          overflow: hidden !important;

          page-break-before: always !important;
          page-break-after: auto !important;

          break-before: page !important;
          break-after: auto !important;
        }

        .invoice-page,
        .terms-page {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .infoGrid,
        .vehicleGrid,
        .totalArea,
        .paymentSummary,
        .ppfBox,
        .signatureArea {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

      }


      @media screen and (max-width: 800px) {

        .invoice-page,
        .terms-page {
          transform-origin: top center;
          transform: scale(0.85);
          margin-bottom: -80px !important;
        }

      }

    `;

    document.head.appendChild(printStyle);
  }
}


export default Invoice;