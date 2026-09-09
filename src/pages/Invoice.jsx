import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

function Invoice() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // LOAD JOB
  // =========================================================

  useEffect(() => {
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("LOAD INVOICE ERROR:", error);
        setLoading(false);
        return;
      }

      setJob(data);
    } catch (error) {
      console.error("INVOICE ERROR:", error);
    }

    setLoading(false);
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading Invoice...</h2>
      </div>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!job) {
    return (
      <div style={styles.loading}>
        <h2>Invoice Not Found</h2>
      </div>
    );
  }

  // =========================================================
  // TEYSEER DETECTION
  // =========================================================

  const isTeyseer =
    job.source === "Teyseer Motors" ||
    job.source === "Teyseer Motors - Bahaa" ||
    job.source === "Teyseer Motors - Salah";

  // =========================================================
  // CHECK WTT
  // =========================================================

  const isWTTService = (service) =>
    service?.toLowerCase().includes("wtt");

  // =========================================================
  // TOTAL AMOUNT
  //
  // This is the full value of all services.
  // WTT is included here only as reference.
  // =========================================================

  const totalAmount =
    job.services?.reduce((total, service) => {
      const details =
        job.serviceDetails?.[service] || {};

      const price =
        Number(details.price) || 0;

      const quantity =
        Number(details.quantity) || 1;

      return total + price * quantity;
    }, 0) || 0;

  // =========================================================
  // TOTAL DISCOUNT
  //
  // Only customer-paid services are included.
  // =========================================================

  const totalDiscount =
    job.services?.reduce((total, service) => {
      const details =
        job.serviceDetails?.[service] || {};

      // WTT is paid through Teyseer.
      if (
        isTeyseer &&
        isWTTService(service)
      ) {
        return total;
      }

      return (
        total +
        (Number(details.discount) || 0)
      );
    }, 0) || 0;

  // =========================================================
  // CUSTOMER NET AMOUNT
  //
  // If this is a Teyseer job:
  // WTT is NOT included in the customer amount.
  //
  // Example:
  //
  // WTT       = QAR 1,000
  // PPF       = QAR 2,000
  // Customer  = QAR 2,000
  //
  // WTT is paid by Teyseer.
  // =========================================================

  const netAmount =
    job.services?.reduce((total, service) => {
      const details =
        job.serviceDetails?.[service] || {};

      const isWTT =
        isWTTService(service);

      // -----------------------------------------
      // TEYSEER WTT
      // -----------------------------------------

      if (
        isTeyseer &&
        isWTT
      ) {
        return total;
      }

      // -----------------------------------------
      // CUSTOMER SERVICE
      // -----------------------------------------

      const price =
        Number(details.price) || 0;

      const quantity =
        Number(details.quantity) || 1;

      const discount =
        Number(details.discount) || 0;

      return (
        total +
        Math.max(
          price * quantity - discount,
          0
        )
      );
    }, 0) || 0;

  // =========================================================
  // WTT TOTAL
  // =========================================================

  const teyseerWTTAmount =
    isTeyseer
      ? job.services?.reduce(
          (total, service) => {
            if (
              !isWTTService(service)
            ) {
              return total;
            }

            const details =
              job.serviceDetails?.[
                service
              ] || {};

            const price =
              Number(details.price) || 0;

            const quantity =
              Number(details.quantity) || 1;

            const discount =
              Number(details.discount) || 0;

            return (
              total +
              Math.max(
                price * quantity -
                  discount,
                0
              )
            );
          },
          0
        ) || 0
      : 0;

  // =========================================================
  // PRINT
  // =========================================================

  function printInvoice() {
    window.print();
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div style={styles.page}>

      {/* =====================================================
          PAGE 1
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

          {/* LOGO */}

          <div style={styles.logoArea}>

            <img
              src={gaLogo}
              alt="GA Logo"
              style={styles.logo}
            />

          </div>


          {/* COMPANY */}

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
              <span style={styles.separator}>
                |
              </span>
              C.R.NO: 199725
              <span style={styles.separator}>
                |
              </span>
              info@haoshengcar.com
            </p>

          </div>


          {/* INVOICE BADGE */}

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
            CUSTOMER + BILLING
        ================================================== */}

        <div style={styles.infoGrid}>

          {/* CUSTOMER INFORMATION */}

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


              <div
                style={{
                  ...styles.infoRow,
                  borderBottom: "none",
                }}
              >

                <span style={styles.infoLabel}>
                  INVOICE DATE
                </span>

                <span style={styles.infoValue}>
                  {job.date ||
                    (job.created_at
                      ? new Date(
                          job.created_at
                        ).toLocaleDateString(
                          "en-GB"
                        )
                      : "-")}
                </span>

              </div>

            </div>

          </div>


          {/* BILLING INFORMATION */}

          <div style={styles.infoCard}>

            <div style={styles.cardHeader}>
              BILLING INFORMATION
            </div>

            <div style={styles.cardBody}>

              {/* NORMAL JOB */}

              {!isTeyseer && (
                <div
                  style={{
                    ...styles.billingMessage,
                    borderBottom:
                      "none",
                  }}
                >

                  <span>
                    CUSTOMER AMOUNT
                  </span>

                  <strong>
                    QAR{" "}
                    {netAmount.toFixed(2)}
                  </strong>

                </div>
              )}


              {/* TEYSEER JOB */}

              {isTeyseer && (
                <>
                  <div style={styles.infoRow}>

                    <span
                      style={styles.infoLabel}
                    >
                      CUSTOMER AMOUNT
                    </span>

                    <strong
                      style={{
                        ...styles.infoValue,
                        color: colors.black,
                      }}
                    >
                      QAR{" "}
                      {netAmount.toFixed(2)}
                    </strong>

                  </div>


                  {/* KEEP THIS PAID THROUGH TEYSEER NOTICE */}

                  <div style={styles.teyseerNotice}>

                    <div
                      style={
                        styles.teyseerNoticeTitle
                      }
                    >
                      WTT
                    </div>

                    <div
                      style={
                        styles.teyseerNoticeText
                      }
                    >
                      PAID THROUGH TEYSEER
                    </div>

                  </div>


                  {job.voucherNumber && (
                    <div
                      style={{
                        ...styles.infoRow,
                        borderBottom:
                          "none",
                      }}
                    >

                      <span
                        style={
                          styles.infoLabel
                        }
                      >
                        TEYSEER VOUCHER NO.
                      </span>

                      <strong
                        style={
                          styles.voucherValue
                        }
                      >
                        {job.voucherNumber}
                      </strong>

                    </div>
                  )}

                </>
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

            {job.services?.map(
              (service, index) => {

                const details =
                  job.serviceDetails?.[
                    service
                  ] || {};

                const price =
                  Number(details.price) ||
                  0;

                const quantity =
                  Number(
                    details.quantity
                  ) || 1;

                const serviceDiscount =
                  Number(
                    details.discount
                  ) || 0;

                const serviceTotal =
                  Math.max(
                    price * quantity -
                      serviceDiscount,
                    0
                  );

                const wttPaidByTeyseer =
                  isTeyseer &&
                  isWTTService(service);

                return (
                  <tr key={index}>

                    {/* SERVICE */}

                    <td
                      style={{
                        ...styles.serviceCell,
                        textAlign: "left",
                        fontWeight: "600",
                      }}
                    >

                      <div>
                        {service}
                      </div>

                      {wttPaidByTeyseer && (
                        <div
                          style={
                            styles.wttPaidLabel
                          }
                        >
                          PAID THROUGH TEYSEER
                        </div>
                      )}

                    </td>


                    {/* PRICE */}

                    <td
                      style={
                        styles.serviceCell
                      }
                    >

                      {wttPaidByTeyseer ? (
                        <span
                          style={
                            styles.paidThroughText
                          }
                        >
                          TEYSEER
                        </span>
                      ) : (
                        <>
                          QAR{" "}
                          {price.toFixed(2)}
                        </>
                      )}

                    </td>


                    {/* QTY */}

                    <td
                      style={
                        styles.serviceCell
                      }
                    >
                      {quantity}
                    </td>


                    {/* DISCOUNT */}

                    <td
                      style={
                        styles.serviceCell
                      }
                    >

                      {wttPaidByTeyseer ? (
                        "-"
                      ) : (
                        <>
                          QAR{" "}
                          {serviceDiscount.toFixed(
                            2
                          )}
                        </>
                      )}

                    </td>


                    {/* TOTAL */}

                    <td
                      style={{
                        ...styles.serviceCell,
                        fontWeight: "800",
                      }}
                    >

                      {wttPaidByTeyseer ? (
                        <span
                          style={
                            styles.paidThroughText
                          }
                        >
                          PAID
                        </span>
                      ) : (
                        <>
                          QAR{" "}
                          {serviceTotal.toFixed(
                            2
                          )}
                        </>
                      )}

                    </td>

                  </tr>
                );
              }
            )}


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
            NET AMOUNT
        ================================================== */}

        <div style={styles.totalArea}>

          <div style={styles.totalBox}>

            <div style={styles.totalRow}>

              <span>
                NET AMOUNT
              </span>

              <strong>
                QAR{" "}
                {netAmount.toFixed(2)}
              </strong>

            </div>

          </div>

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
          PAGE 2
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


        {/* ENGLISH TERMS */}

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


        {/* ARABIC TERMS */}

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
          onClick={printInvoice}
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
  black: "#050505",
  darkBlack: "#0B0B0B",
  gold: "#C9A24E",
  brightGold: "#D8B766",
  lightGold: "#F7F0DF",
  darkText: "#171717",
  gray: "#666666",
  lightGray: "#F6F6F6",
  border: "#D6D0C4",
  white: "#FFFFFF",
};


/* =========================================================
   STYLES
========================================================= */

const styles = {

  page: {
    background: "#E5E5E5",
    minHeight: "100vh",
    padding: "20px 0",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: colors.darkText,
  },


  loading: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },


  /* =====================================================
     PAGE 1
  ====================================================== */

  invoice: {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto 20px",
    padding: "8mm",
    position: "relative",
    overflow: "hidden",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.15)",
  },


  topBar: {
    height: "6px",
    width: "100%",
    background:
      `linear-gradient(
        90deg,
        ${colors.black} 0%,
        ${colors.black} 68%,
        ${colors.gold} 68%,
        ${colors.gold} 100%
      )`,
    marginBottom: "12px",
  },


  /* =====================================================
     HEADER
  ====================================================== */

  header: {
    display: "grid",
    gridTemplateColumns:
      "24% 56% 20%",
    alignItems: "center",
    minHeight: "100px",
  },


  logoArea: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "4px",
  },


  logo: {
    width: "105px",
    maxHeight: "88px",
    objectFit: "contain",
  },


  companyInfo: {
    textAlign: "center",
    padding: "0 5px",
  },


  companyName: {
    color: colors.black,
    fontSize: "18px",
    lineHeight: "1.1",
    margin: "0 0 5px",
    fontWeight: "900",
    letterSpacing: "0.4px",
  },


  companyArabic: {
    color: colors.gold,
    fontSize: "15px",
    margin: "3px 0 6px",
    fontWeight: "700",
  },


  address: {
    fontSize: "9px",
    margin: "3px 0",
    color: colors.gray,
  },


  contact: {
    fontSize: "8px",
    margin: "3px 0",
    color: colors.gray,
  },


  separator: {
    margin: "0 4px",
    color: colors.gold,
    fontWeight: "bold",
  },


  invoiceBadge: {
    background: colors.black,
    color: colors.white,
    padding: "12px 7px",
    textAlign: "center",
    borderRadius: "3px",
    borderBottom:
      `4px solid ${colors.gold}`,
  },


  invoiceLabel: {
    fontSize: "16px",
    fontWeight: "900",
    letterSpacing: "1px",
    color: colors.gold,
  },


  invoiceArabic: {
    fontSize: "13px",
    marginTop: "2px",
    color: colors.white,
  },


  receiptNumber: {
    fontSize: "10px",
    marginTop: "8px",
    color: colors.white,
  },


  /* =====================================================
     CUSTOMER / BILLING
  ====================================================== */

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    marginTop: "10px",
  },


  infoCard: {
    border:
      `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden",
  },


  cardHeader: {
    background: colors.black,
    color: colors.gold,
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.6px",
    padding: "7px 9px",
    borderBottom:
      `2px solid ${colors.gold}`,
  },


  cardBody: {
    padding: "6px 9px",
  },


  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom:
      "1px solid #EEEEEE",
    gap: "10px",
  },


  infoLabel: {
    fontSize: "8px",
    color: colors.gray,
    fontWeight: "800",
  },


  infoValue: {
    fontSize: "9px",
    fontWeight: "700",
    textAlign: "right",
  },


  billingMessage: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 0",
    fontSize: "10px",
    fontWeight: "900",
  },


  voucherValue: {
    fontSize: "10px",
    color: colors.black,
    fontWeight: "900",
  },


  teyseerNotice: {
    background: "#F7F0DF",
    border:
      `1px solid ${colors.gold}`,
    borderRadius: "3px",
    padding: "6px 8px",
    margin: "4px 0",
    textAlign: "center",
  },


  teyseerNoticeTitle: {
    fontSize: "8px",
    fontWeight: "900",
    color: colors.black,
  },


  teyseerNoticeText: {
    fontSize: "8px",
    fontWeight: "900",
    color: colors.gold,
    marginTop: "2px",
  },


  /* =====================================================
     VEHICLE
  ====================================================== */

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "11px",
    marginBottom: "6px",
    padding: "7px 9px",
    background: colors.black,
    color: colors.white,
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.7px",
    borderLeft:
      `5px solid ${colors.gold}`,
  },


  sectionArabic: {
    fontSize: "10px",
    color: colors.gold,
  },


  vehicleGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5, 1fr)",
    border:
      `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden",
  },


  vehicleItem: {
    minHeight: "55px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "5px",
    borderRight:
      `1px solid ${colors.border}`,
    background: "#FEFEFE",
    textAlign: "center",
  },


  vehicleLabel: {
    fontSize: "7px",
    color: colors.gray,
    fontWeight: "900",
    letterSpacing: "0.6px",
    marginBottom: "4px",
  },


  vehicleValue: {
    fontSize: "10px",
    color: colors.black,
  },


  vehicleArabic: {
    fontSize: "7px",
    color: colors.gold,
    marginTop: "3px",
  },


  /* =====================================================
     SERVICE TABLE
  ====================================================== */

  serviceTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10px",
  },


  serviceHeader: {
    background: colors.black,
    color: colors.gold,
    border:
      `1px solid ${colors.black}`,
    padding: "8px 5px",
    textAlign: "center",
    fontSize: "8px",
    letterSpacing: "0.5px",
  },


  serviceCell: {
    border:
      `1px solid ${colors.border}`,
    padding: "8px 6px",
    textAlign: "center",
    fontSize: "9px",
    color: colors.darkText,
  },


  emptyCell: {
    border:
      `1px solid ${colors.border}`,
    padding: "12px",
    textAlign: "center",
    color: colors.gray,
  },


  wttPaidLabel: {
    display: "inline-block",
    marginTop: "3px",
    fontSize: "6.5px",
    color: colors.gold,
    fontWeight: "900",
    letterSpacing: "0.3px",
  },


  paidThroughText: {
    color: colors.gold,
    fontWeight: "900",
    fontSize: "8px",
  },


  /* =====================================================
     TOTAL
  ====================================================== */

  totalArea: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "10px",
  },


  totalBox: {
    width: "48%",
    border:
      `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden",
  },


  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px",
    fontSize: "10px",
    fontWeight: "900",
    borderBottom:
      `2px solid ${colors.gold}`,
  },


  /* =====================================================
     PPF
  ====================================================== */

  ppfBox: {
    marginTop: "10px",
    border:
      `1px solid ${colors.gold}`,
    borderRadius: "3px",
    overflow: "hidden",
  },


  ppfTitle: {
    background: colors.black,
    color: colors.gold,
    fontSize: "9px",
    fontWeight: "900",
    padding: "7px 9px",
    borderBottom:
      `1px solid ${colors.gold}`,
  },


  ppfContent: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "4px 15px",
    padding: "8px 9px",
    fontSize: "8px",
    lineHeight: "1.3",
  },


  /* =====================================================
     SIGNATURES
  ====================================================== */

  signatureArea: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "70px",
    marginTop: "18px",
  },


  signatureBox: {
    textAlign: "center",
  },


  signatureTitle: {
    fontSize: "8px",
    color: colors.black,
    fontWeight: "900",
  },


  signatureLine: {
    borderBottom:
      `1px solid ${colors.black}`,
    marginTop: "28px",
  },


  signatureSub: {
    fontSize: "8px",
    color: colors.gray,
    marginTop: "3px",
  },


  /* =====================================================
     FOOTER
  ====================================================== */

  footer: {
    position: "absolute",
    bottom: "7mm",
    left: "8mm",
    right: "8mm",
    textAlign: "center",
    fontSize: "8px",
    color: colors.gray,
    borderTop:
      `1px solid ${colors.border}`,
    paddingTop: "5px",
  },


  /* =====================================================
     PAGE 2
  ====================================================== */

  termsPage: {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto",
    padding: "8mm",
    position: "relative",
    overflow: "hidden",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.15)",
    fontSize: "10px",
    lineHeight: "1.28",
  },


  termsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "4px 5px 8px",
  },


  termsLogo: {
    width: "75px",
    height: "58px",
    objectFit: "contain",
  },


  termsMainTitle: {
    margin: "0",
    fontSize: "21px",
    color: colors.black,
    letterSpacing: "0.8px",
    fontWeight: "900",
  },


  termsArabicTitle: {
    margin: "4px 0 0",
    fontSize: "16px",
    color: colors.gold,
  },


  termsDivider: {
    height: "2px",
    background:
      `linear-gradient(
        90deg,
        ${colors.black},
        ${colors.gold}
      )`,
    margin: "4px 0 10px",
  },


  termsSection: {
    padding: "0 4px",
  },


  termsHeading: {
    color: colors.gold,
    fontSize: "14px",
    fontWeight: "900",
    margin: "7px 0 4px",
    borderLeft:
      `4px solid ${colors.gold}`,
    paddingLeft: "7px",
  },


  arabicTerms: {
    padding: "0 4px",
    textAlign: "right",
  },


  arabicTermsHeading: {
    color: colors.gold,
    fontSize: "14px",
    fontWeight: "900",
    margin: "7px 0 4px",
    borderRight:
      `4px solid ${colors.gold}`,
    paddingRight: "7px",
  },


  termsParagraph: {
    margin: "4px 0",
    fontSize: "8.8px",
  },


  termsFooter: {
    position: "absolute",
    bottom: "7mm",
    left: "8mm",
    right: "8mm",
    textAlign: "center",
    borderTop:
      `1px solid ${colors.border}`,
    paddingTop: "5px",
    fontSize: "7px",
    color: colors.gray,
  },


  /* =====================================================
     PRINT BUTTON
  ====================================================== */

  printButton: {
    position: "fixed",
    right: "25px",
    bottom: "25px",
    background: colors.black,
    color: colors.gold,
    border:
      `1px solid ${colors.gold}`,
    padding: "13px 24px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.25)",
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

      html,
      body {
        margin: 0;
        padding: 0;
      }

      @media print {

        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
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
          min-height: 297mm !important;
          max-height: 297mm !important;

          margin: 0 !important;
          padding: 8mm !important;

          background: white !important;
          box-shadow: none !important;

          overflow: hidden !important;

          page-break-after: always !important;
          break-after: page !important;
        }

        .terms-page {
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;

          margin: 0 !important;
          padding: 8mm !important;

          background: white !important;
          box-shadow: none !important;

          overflow: hidden !important;

          page-break-before: always !important;
          page-break-after: avoid !important;

          break-before: page !important;
          break-after: avoid !important;
        }

        table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }

        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        img {
          page-break-inside: avoid !important;
        }

      }

      @media screen and (max-width: 800px) {

        .invoice-page,
        .terms-page {
          width: 210mm;
          transform-origin: top center;
          transform: scale(0.75);
          margin-bottom: -70px !important;
        }

      }

    `;

    document.head.appendChild(printStyle);
  }
}


export default Invoice;