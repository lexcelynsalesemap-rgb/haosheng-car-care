
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

// =========================================================
// INVOICE TRANSLATIONS
// =========================================================

const invoiceTranslations = {
  ar: {
    "Loading Invoice...": "جاري تحميل الفاتورة...",
    "Invoice Not Found": "الفاتورة غير موجودة",
    INVOICE: "فاتورة",
    "CUSTOMER INFORMATION": "معلومات العميل",
    "CUSTOMER NAME": "اسم العميل",
    "MOBILE NUMBER": "رقم الهاتف",
    "INVOICE DATE": "تاريخ الفاتورة",
    "BILLING INFORMATION": "معلومات الدفع",
    "CUSTOMER AMOUNT": "المبلغ المستحق من العميل",
    "ALL SERVICES": "جميع الخدمات",
    "ALL SERVICES PAID THROUGH TEYSEER": "جميع الخدمات مدفوعة من خلال تيسير",
    "PAID THROUGH TEYSEER": "مدفوع من خلال تيسير",
    "TEYSEER VOUCHER NO.": "رقم قسيمة تيسير",
    "VEHICLE INFORMATION": "معلومات المركبة",
    MAKE: "الشركة المصنعة",
    MODEL: "الموديل",
    COLOR: "اللون",
    CHASSIS: "رقم الهيكل",
    PLATE: "رقم اللوحة",
    "SERVICE OFFERED": "الخدمات المقدمة",
    SERVICE: "الخدمة",
    PRICE: "السعر",
    QTY: "الكمية",
    DISCOUNT: "الخصم",
    TOTAL: "الإجمالي",
    "No services added": "لم تتم إضافة خدمات",
    TEYSEER: "تيسير",
    PAID: "مدفوع",
    "NET AMOUNT": "صافي المبلغ",
    "PPF WARRANTY": "ضمان حماية الطلاء",
    "8 YEARS": "8 سنوات",
    "FREE CHECK UP AFTER 1 WEEK FOR PPF": "فحص مجاني بعد أسبوع واحد لحماية الطلاء",
    "1X FREE AFTER HALF YEAR PPF CHEMICAL SERVICE PROTECTION": "خدمة حماية كيميائية مجانية مرة واحدة بعد نصف سنة",
    "CUSTOMER'S SIGNATURE": "توقيع العميل",
    "AUTHORIZED SIGNATURE": "التوقيع المعتمد",
    "Thank you for choosing Haosheng Car Care": "شكراً لاختياركم هاوشنغ للعناية بالسيارات",
    "TERMS AND CONDITIONS": "الشروط والأحكام",
    WARRANTY: "الضمان",
    CONDITIONS: "الشروط",
    "ADDITIONAL SERVICES": "خدمات إضافية",
    "Print Invoice": "طباعة الفاتورة",
    "Quarter panel protection: 5-year warranty.": "حماية ربع لوحة السيارة: ضمان 5 سنوات.",
    "Thermal insulation warranty: 10 years.": "ضمان العزل الحراري: 10 سنوات.",
    "Nano-ceramic service: 2 years for shine, 6 months for water repellency.": "خدمة نانو سيراميك: سنتان للمعان و6 أشهر لمقاومة الماء.",
    "FREE CHECK UP AFTER 1 WEEK FOR PPF": "فحص مجاني بعد أسبوع واحد لحماية الطلاء",
    "8 YEARS": "8 سنوات",
    "All services": "جميع الخدمات",
    "Warranty": "الضمان",
    "Conditions": "الشروط",
    "Additional Services": "خدمات إضافية"
  },

  zh: {
    "Loading Invoice...": "正在加载发票...",
    "Invoice Not Found": "未找到发票",
    INVOICE: "发票",
    "CUSTOMER INFORMATION": "客户信息",
    "CUSTOMER NAME": "客户姓名",
    "MOBILE NUMBER": "手机号码",
    "INVOICE DATE": "发票日期",
    "BILLING INFORMATION": "账单信息",
    "CUSTOMER AMOUNT": "客户应付金额",
    "ALL SERVICES": "所有服务",
    "ALL SERVICES PAID THROUGH TEYSEER": "所有服务费用由 Teyseer 支付",
    "PAID THROUGH TEYSEER": "由 Teyseer 支付",
    "TEYSEER VOUCHER NO.": "Teyseer 凭证号码",
    "VEHICLE INFORMATION": "车辆信息",
    MAKE: "品牌",
    MODEL: "型号",
    COLOR: "颜色",
    CHASSIS: "底盘号码",
    PLATE: "车牌号码",
    "SERVICE OFFERED": "提供的服务",
    SERVICE: "服务项目",
    PRICE: "价格",
    QTY: "数量",
    DISCOUNT: "折扣",
    TOTAL: "总计",
    "No services added": "尚未添加服务",
    TEYSEER: "Teyseer",
    PAID: "已付款",
    "NET AMOUNT": "净金额",
    "PPF WARRANTY": "漆面保护膜保修",
    "8 YEARS": "8年",
    "FREE CHECK UP AFTER 1 WEEK FOR PPF": "PPF施工后一周免费检查",
    "1X FREE AFTER HALF YEAR PPF CHEMICAL SERVICE PROTECTION": "半年后免费享受一次PPF化学保护护理",
    "CUSTOMER'S SIGNATURE": "客户签名",
    "AUTHORIZED SIGNATURE": "授权签名",
    "Thank you for choosing Haosheng Car Care": "感谢您选择浩盛汽车护理中心",
    "TERMS AND CONDITIONS": "条款与条件",
    WARRANTY: "保修条款",
    CONDITIONS: "使用条件",
    "ADDITIONAL SERVICES": "其他服务",
    "Print Invoice": "打印发票",
    "Quarter panel protection: 5-year warranty.": "车辆侧后翼子板保护：5年保修。",
    "Thermal insulation warranty: 10 years.": "隔热膜保修：10年。",
    "Nano-ceramic service: 2 years for shine, 6 months for water repellency.": "纳米陶瓷护理：光泽保修2年，防水效果6个月。",
    "All services": "所有服务",
    Warranty: "保修条款",
    Conditions: "使用条件",
    "Additional Services": "其他服务"
  }
};

function translateInvoice(text, language) {
  return invoiceTranslations[language]?.[text] || text;
}

// =========================================================
// TERMS AND CONDITIONS
// =========================================================

const englishTerms = [
  {
    heading: "WARRANTY",
    paragraphs: [
      "We, the Haosheng Car Care team, are pleased to offer you a warranty when you install full vehicle protection or full front-end protection (excluding misuse).",
      "Quarter panel protection: 5-year warranty.",
      "Protection warranty includes Nano-ceramic shine, yellowing, self-healing of scratches, cracking, and paint removal.",
      "Thermal insulation warranty: 10 years.",
      "Nano-ceramic service: 2 years for shine, 6 months for water repellency."
    ]
  },
  {
    heading: "CONDITIONS",
    paragraphs: [
      "Signing the invoice or receipt by the customer is considered acceptance and receipt of the protection on the vehicle and cannot be denied or contested.",
      "The consumer cannot obtain post-installation services during the warranty period for maintenance or replacement if they caused the damage or used inappropriate car washing materials.",
      "The warranty does not apply to any of our products if tampered with or repaired, modified, or maintained by unauthorized persons.",
      "The warranty does not cover replacement of parts damaged by severe scratches or accidents. Damage will be assessed by company technicians to determine the cost of replacement.",
      "The customer must bring the vehicle for maintenance six days after protection installation.",
      "The customer must bring the vehicle for annual maintenance and protection inspection. Failure to comply with the schedule voids the warranty.",
      "Washing the car with materials that damage the protection, causing scratches or yellowing, voids the warranty."
    ]
  },
  {
    heading: "ADDITIONAL SERVICES",
    paragraphs: [
      "We offer car washing and protection inspection services once a month for a nominal fee."
    ]
  }
];

const chineseTerms = [
  {
    heading: "保修条款",
    paragraphs: [
      "浩盛汽车护理团队很高兴为您提供车辆全车保护或前部全面保护服务的保修（不包括不当使用造成的损坏）。",
      "车辆侧后翼子板保护：5年保修。",
      "保护膜保修范围包括纳米陶瓷光泽、发黄、自修复划痕、开裂及漆面脱落。",
      "隔热膜保修：10年。",
      "纳米陶瓷护理：光泽保修2年，防水效果6个月。"
    ]
  },
  {
    heading: "使用条件",
    paragraphs: [
      "客户签署发票或收据，即表示接受并确认车辆已完成保护施工，不得否认或提出异议。",
      "如果客户在保修期内因自身原因造成损坏，或使用不适当的汽车清洗材料，则不能享受相关维护或更换服务。",
      "如果产品被未经授权的人员拆动、维修、改装或保养，本公司将不再提供保修。",
      "保修不包括因严重划痕或事故损坏而需要更换的零件。公司技术人员将评估损坏情况并确定更换费用。",
      "客户必须在保护膜施工六天后将车辆送回进行维护。",
      "客户必须按照安排将车辆送回进行年度维护及保护检查。未按计划进行检查将导致保修失效。",
      "如果使用会损坏保护膜并导致划痕或发黄的清洗材料，保修将失效。"
    ]
  },
  {
    heading: "其他服务",
    paragraphs: [
      "我们每月提供一次汽车清洗及保护检查服务，并收取少量费用。"
    ]
  }
];

const arabicTerms = [
  {
    heading: "الضمان",
    paragraphs: [
      "يسرّنا في فريق هاوشنغ للعناية بالسيارات أن نقدم لكم ضمانًا عند تركيب حماية كاملة لسيارتكم أو حماية كاملة للواجهة الأمامية (باستثناء سوء الاستخدام).",
      "حماية ربع لوحة السيارة: ضمان 5 سنوات.",
      "يشمل ضمان الحماية لمعان نانو سيراميك، والاصفرار، والمعالجة الذاتية للخدوش والتشققات، وإزالة الطلاء.",
      "ضمان العزل الحراري: 10 سنوات.",
      "خدمة نانو سيراميك: سنتان للمعان، و6 أشهر لمقاومة الماء."
    ]
  },
  {
    heading: "الشروط",
    paragraphs: [
      "يُعد توقيع العميل على الفاتورة أو الإيصال قبولاً واستلاماً للحماية على المركبة، ولا يجوز رفضه أو الاعتراض عليه.",
      "لا يحق للمستهلك الحصول على خدمات ما بعد التركيب خلال فترة الضمان للصيانة أو الاستبدال إذا تسبب في تلف المركبة أو استخدم مواد غسيل غير مناسبة.",
      "لا ينطبق الضمان على أي من منتجاتنا إذا تم العبث بها أو إصلاحها أو تعديلها أو صيانتها من قبل أشخاص غير مصرح لهم.",
      "لا يغطي الضمان استبدال الأجزاء التالفة بسبب الخدوش الشديدة أو الحوادث. سيقوم الفريق الفني للشركة بتقييم الضرر لتحديد تكلفة الاستبدال.",
      "يجب على العميل إحضار المركبة للصيانة بعد 6 أيام من تركيب الحماية.",
      "يجب على العميل إحضار المركبة للصيانة السنوية وفحص الحماية. يُبطل الضمان عدم الالتزام بالجدول الزمني.",
      "يُبطل الضمان عند غسل السيارة بمواد تُتلف الحماية، أو تُسبب خدوشاً أو اصفراراً."
    ]
  },
  {
    heading: "خدمات إضافية",
    paragraphs: [
      "نقدم خدمات غسيل السيارات وفحص الحماية مرة واحدة شهريًا مقابل رسوم رمزية."
    ]
  }
];

// =========================================================
// COMPONENT
// =========================================================

function Invoice() {
  const { id } = useParams();
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage || i18n.language || "en";
  const tr = (text) => translateInvoice(text, language);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const isArabic = language === "ar";
  const isChinese = language === "zh";

  // =========================================================
  // LOAD JOB
  // =========================================================

  useEffect(() => {
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
          setJob(null);
          return;
        }

        setJob(data);
      } catch (error) {
        console.error("INVOICE ERROR:", error);
        setJob(null);
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>{tr("Loading Invoice...")}</h2>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={styles.loading}>
        <h2>{tr("Invoice Not Found")}</h2>
      </div>
    );
  }

  // =========================================================
  // TEYSEER DETECTION
  // =========================================================

  const isFullTeyseerSource = job.source === "Teyseer Motors";

  const isTeyseer =
    isFullTeyseerSource ||
    job.source === "Teyseer Motors - Bahaa" ||
    job.source === "Teyseer Motors - Salah";

  const isWTTService = (service) =>
    service?.toLowerCase().includes("wtt");

  // =========================================================
  // TOTAL AMOUNT
  // =========================================================

  const totalAmount =
    job.services?.reduce((total, service) => {
      const details = job.serviceDetails?.[service] || {};
      const price = Number(details.price) || 0;
      const quantity = Number(details.quantity) || 1;

      return total + price * quantity;
    }, 0) || 0;

  // =========================================================
  // TOTAL DISCOUNT
  // =========================================================

  const totalDiscount =
    job.services?.reduce((total, service) => {
      const details = job.serviceDetails?.[service] || {};

      if (
        isFullTeyseerSource ||
        (isTeyseer && isWTTService(service))
      ) {
        return total;
      }

      return total + (Number(details.discount) || 0);
    }, 0) || 0;

  // =========================================================
  // CUSTOMER NET AMOUNT
  // =========================================================

  const netAmount = isFullTeyseerSource
    ? 0
    : job.services?.reduce((total, service) => {
        const details = job.serviceDetails?.[service] || {};
        const isWTT = isWTTService(service);

        if (isTeyseer && isWTT) {
          return total;
        }

        const price = Number(details.price) || 0;
        const quantity = Number(details.quantity) || 1;
        const discount = Number(details.discount) || 0;

        return total + Math.max(price * quantity - discount, 0);
      }, 0) || 0;

  // =========================================================
  // WTT TOTAL
  // =========================================================

  const teyseerWTTAmount = isTeyseer
    ? job.services?.reduce((total, service) => {
        if (!isWTTService(service)) return total;

        const details = job.serviceDetails?.[service] || {};
        const price = Number(details.price) || 0;
        const quantity = Number(details.quantity) || 1;
        const discount = Number(details.discount) || 0;

        return total + Math.max(price * quantity - discount, 0);
      }, 0) || 0
    : 0;

  function printInvoice() {
    window.print();
  }

  const terms = isArabic
    ? arabicTerms
    : isChinese
      ? chineseTerms
      : englishTerms;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div style={styles.page}>

      {/* PAGE 1 */}

      <section className="invoice-page" style={styles.invoice}>

        <div style={styles.topBar}></div>

        {/* COMPANY HEADER */}

        <header style={styles.header}>

          <div style={styles.logoArea}>
            <img src={gaLogo} alt="GA Logo" style={styles.logo} />
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
            <div style={styles.invoiceLabel}>{tr("INVOICE")}</div>
            <div style={styles.invoiceArabic}>الفاتورة</div>
            <div style={styles.receiptNumber}>
              #{job.receipt_number || "N/A"}
            </div>
          </div>

        </header>

        {/* CUSTOMER AND BILLING */}

        <div style={styles.infoGrid}>

          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              {tr("CUSTOMER INFORMATION")}
            </div>

            <div style={styles.cardBody}>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  {tr("CUSTOMER NAME")}
                </span>
                <span style={styles.infoValue}>
                  {job.customer || "-"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  {tr("MOBILE NUMBER")}
                </span>
                <span style={styles.infoValue}>
                  {job.phone || "-"}
                </span>
              </div>

              <div style={{ ...styles.infoRow, borderBottom: "none" }}>
                <span style={styles.infoLabel}>
                  {tr("INVOICE DATE")}
                </span>
                <span style={styles.infoValue}>
                  {job.date ||
                    (job.created_at
                      ? new Date(job.created_at).toLocaleDateString("en-GB")
                      : "-")}
                </span>
              </div>

            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              {tr("BILLING INFORMATION")}
            </div>

            <div style={styles.cardBody}>

              {!isTeyseer && (
                <div style={{ ...styles.billingMessage, borderBottom: "none" }}>
                  <span>{tr("CUSTOMER AMOUNT")}</span>
                  <strong>QAR {netAmount.toFixed(2)}</strong>
                </div>
              )}

              {isTeyseer && (
                <>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>
                      {tr("CUSTOMER AMOUNT")}
                    </span>
                    <strong style={{ ...styles.infoValue, color: colors.black }}>
                      QAR {netAmount.toFixed(2)}
                    </strong>
                  </div>

                  <div style={styles.teyseerNotice}>
                    <div style={styles.teyseerNoticeTitle}>
                      {tr(isFullTeyseerSource ? "ALL SERVICES" : "WTT")}
                    </div>
                    <div style={styles.teyseerNoticeText}>
                      {tr(
                        isFullTeyseerSource
                          ? "ALL SERVICES PAID THROUGH TEYSEER"
                          : "PAID THROUGH TEYSEER"
                      )}
                    </div>
                  </div>

                  {job.voucherNumber && (
                    <div style={{ ...styles.infoRow, borderBottom: "none" }}>
                      <span style={styles.infoLabel}>
                        {tr("TEYSEER VOUCHER NO.")}
                      </span>
                      <strong style={styles.voucherValue}>
                        {job.voucherNumber}
                      </strong>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

        </div>

        {/* VEHICLE INFORMATION */}

        <div style={styles.sectionHeading}>
          <div>{tr("VEHICLE INFORMATION")}</div>
          <div style={styles.sectionArabic}>معلومات المركبة</div>
        </div>

        <div style={styles.vehicleGrid}>

          {[
            ["MAKE", job.carType, "العلامة"],
            ["MODEL", job.carModel, "النوع"],
            ["COLOR", job.color, "اللون"],
            ["CHASSIS", job.chassis, "الهيكل"],
            ["PLATE", job.plate, "اللوحة"]
          ].map(([label, value, arabic]) => (
            <div key={label} style={styles.vehicleItem}>
              <span style={styles.vehicleLabel}>{tr(label)}</span>
              <strong style={styles.vehicleValue}>{value || "-"}</strong>
              <small style={styles.vehicleArabic}>{arabic}</small>
            </div>
          ))}

        </div>

        {/* SERVICES */}

        <div style={styles.sectionHeading}>
          <div>{tr("SERVICE OFFERED")}</div>
          <div style={styles.sectionArabic}>الخدمة المقدمة</div>
        </div>

        <table style={styles.serviceTable}>
          <thead>
            <tr>
              {["SERVICE", "PRICE", "QTY", "DISCOUNT", "TOTAL"].map((heading) => (
                <th key={heading} style={styles.serviceHeader}>
                  {tr(heading)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {job.services?.map((service, index) => {
              const details = job.serviceDetails?.[service] || {};
              const price = Number(details.price) || 0;
              const quantity = Number(details.quantity) || 1;
              const serviceDiscount = Number(details.discount) || 0;

              const serviceTotal = Math.max(
                price * quantity - serviceDiscount,
                0
              );

              const servicePaidByTeyseer =
                isFullTeyseerSource ||
                (isTeyseer && isWTTService(service));

              return (
                <tr key={index}>

                  <td
                    style={{
                      ...styles.serviceCell,
                      textAlign: isArabic ? "right" : "left",
                      fontWeight: "600"
                    }}
                  >
                    <div>{service}</div>

                    {servicePaidByTeyseer && (
                      <div style={styles.wttPaidLabel}>
                        {tr("PAID THROUGH TEYSEER")}
                      </div>
                    )}
                  </td>

                  <td style={styles.serviceCell}>
                    {servicePaidByTeyseer ? (
                      <span style={styles.paidThroughText}>
                        {tr("TEYSEER")}
                      </span>
                    ) : (
                      <>QAR {price.toFixed(2)}</>
                    )}
                  </td>

                  <td style={styles.serviceCell}>{quantity}</td>

                  <td style={styles.serviceCell}>
                    {servicePaidByTeyseer
                      ? "-"
                      : `QAR ${serviceDiscount.toFixed(2)}`}
                  </td>

                  <td style={{ ...styles.serviceCell, fontWeight: "800" }}>
                    {servicePaidByTeyseer ? (
                      <span style={styles.paidThroughText}>
                        {tr("PAID")}
                      </span>
                    ) : (
                      `QAR ${serviceTotal.toFixed(2)}`
                    )}
                  </td>

                </tr>
              );
            })}

            {(!job.services || job.services.length === 0) && (
              <tr>
                <td colSpan="5" style={styles.emptyCell}>
                  {tr("No services added")}
                </td>
              </tr>
            )}

          </tbody>
        </table>

        {/* NET AMOUNT */}

        <div style={styles.totalArea}>
          <div style={styles.totalBox}>
            <div style={styles.totalRow}>
              <span>{tr("NET AMOUNT")}</span>
              <strong>QAR {netAmount.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* PPF WARRANTY */}

        <div style={styles.ppfBox}>
          <div style={styles.ppfTitle}>{tr("PPF WARRANTY")}</div>

          <div style={styles.ppfContent}>
            <div><strong>{tr("8 YEARS")}</strong></div>
            <div>{tr("FREE CHECK UP AFTER 1 WEEK FOR PPF")}</div>
            <div dir="rtl">فحص مجاني بعد أسبوع واحد لـ PPF</div>
            <div>{tr("1X FREE AFTER HALF YEAR PPF CHEMICAL SERVICE PROTECTION")}</div>
            <div dir="rtl">
              بعد نصف سنة تحصل على سيرفس للحماية مجاني لمرة واحدة
            </div>
          </div>
        </div>

        {/* SIGNATURES */}

        <div style={styles.signatureArea}>

          <div style={styles.signatureBox}>
            <div style={styles.signatureTitle}>
              {tr("CUSTOMER'S SIGNATURE")}
            </div>
            <div style={styles.signatureLine}></div>
            <div style={styles.signatureSub}>توقيع العميل</div>
          </div>

          <div style={styles.signatureBox}>
            <div style={styles.signatureTitle}>
              {tr("AUTHORIZED SIGNATURE")}
            </div>
            <div style={styles.signatureLine}></div>
            <div style={styles.signatureSub}>التوقيع المعتمد</div>
          </div>

        </div>

        <div style={styles.footer}>
          {tr("Thank you for choosing Haosheng Car Care")}
        </div>

      </section>

      {/* PAGE 2 - TERMS AND CONDITIONS */}

      <section className="terms-page" style={styles.termsPage}>

        <div style={styles.topBar}></div>

        <div style={styles.termsHeader}>

          <img src={gaLogo} alt="GA Logo" style={styles.termsLogo} />

          <div>
            <h1 style={styles.termsMainTitle}>
              {tr("TERMS AND CONDITIONS")}
            </h1>

            <h2 style={styles.termsArabicTitle}>
              شروط وأحكام
            </h2>
          </div>

        </div>

        <div style={styles.termsDivider}></div>

        <div
          style={{
            ...styles.termsSection,
            direction: isArabic ? "rtl" : "ltr",
            textAlign: isArabic ? "right" : "left"
          }}
        >

          {terms.map((section, index) => (
            <div key={index}>

              <h2
                style={{
                  ...styles.termsHeading,
                  borderLeft: isArabic ? "none" : `4px solid ${colors.gold}`,
                  borderRight: isArabic ? `4px solid ${colors.gold}` : "none",
                  paddingLeft: isArabic ? "0" : "7px",
                  paddingRight: isArabic ? "7px" : "0"
                }}
              >
                ❖ {section.heading}
              </h2>

              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} style={styles.termsParagraph}>
                  {paragraphIndex >= 1 && section.heading !== "ADDITIONAL SERVICES" && "• "}
                  {paragraph}
                </p>
              ))}

            </div>
          ))}

        </div>

        <div style={styles.termsDivider}></div>

        {/* ADDITIONAL ARABIC TERMS WHEN ENGLISH OR CHINESE IS SELECTED */}

        {!isArabic && (
          <div style={styles.arabicTerms} dir="rtl">

            {arabicTerms.map((section, index) => (
              <div key={index}>

                <h2 style={styles.arabicTermsHeading}>
                  ❖ {section.heading}
                </h2>

                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} style={styles.termsParagraph}>
                    {paragraphIndex >= 1 && "• "}
                    {paragraph}
                  </p>
                ))}

              </div>
            ))}

          </div>
        )}

        <div style={styles.termsFooter}>
          HAOSHENG CAR SERVICE AND ACCESSORIES
          <br />
          Doha - Qatar
        </div>

        <button
          className="print-button"
          onClick={printInvoice}
          style={styles.printButton}
        >
          🖨 {tr("Print Invoice")}
        </button>

      </section>

    </div>
  );
}

// =========================================================
// COLORS
// =========================================================

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
  white: "#FFFFFF"
};

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    background: "#E5E5E5",
    minHeight: "100vh",
    padding: "20px 0",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: colors.darkText
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, Helvetica, sans-serif"
  },

  invoice: {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto 20px",
    padding: "8mm",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
  },

  topBar: {
    height: "6px",
    width: "100%",
    background: `linear-gradient(90deg, ${colors.black} 0%, ${colors.black} 68%, ${colors.gold} 68%, ${colors.gold} 100%)`,
    marginBottom: "12px"
  },

  header: {
    display: "grid",
    gridTemplateColumns: "24% 56% 20%",
    alignItems: "center",
    minHeight: "100px"
  },

  logoArea: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "4px"
  },

  logo: {
    width: "105px",
    maxHeight: "88px",
    objectFit: "contain"
  },

  companyInfo: {
    textAlign: "center",
    padding: "0 5px"
  },

  companyName: {
    color: colors.black,
    fontSize: "18px",
    lineHeight: "1.1",
    margin: "0 0 5px",
    fontWeight: "900",
    letterSpacing: "0.4px"
  },

  companyArabic: {
    color: colors.gold,
    fontSize: "15px",
    margin: "3px 0 6px",
    fontWeight: "700"
  },

  address: {
    fontSize: "9px",
    margin: "3px 0",
    color: colors.gray
  },

  contact: {
    fontSize: "8px",
    margin: "3px 0",
    color: colors.gray
  },

  separator: {
    margin: "0 4px",
    color: colors.gold,
    fontWeight: "bold"
  },

  invoiceBadge: {
    background: colors.black,
    color: colors.white,
    padding: "12px 7px",
    textAlign: "center",
    borderRadius: "3px",
    borderBottom: `4px solid ${colors.gold}`
  },

  invoiceLabel: {
    fontSize: "16px",
    fontWeight: "900",
    letterSpacing: "1px",
    color: colors.gold
  },

  invoiceArabic: {
    fontSize: "13px",
    marginTop: "2px",
    color: colors.white
  },

  receiptNumber: {
    fontSize: "10px",
    marginTop: "8px",
    color: colors.white
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "10px"
  },

  infoCard: {
    border: `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden"
  },

  cardHeader: {
    background: colors.black,
    color: colors.gold,
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.6px",
    padding: "7px 9px",
    borderBottom: `2px solid ${colors.gold}`
  },

  cardBody: {
    padding: "6px 9px"
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #EEEEEE",
    gap: "10px"
  },

  infoLabel: {
    fontSize: "8px",
    color: colors.gray,
    fontWeight: "800"
  },

  infoValue: {
    fontSize: "9px",
    fontWeight: "700",
    textAlign: "right"
  },

  billingMessage: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 0",
    fontSize: "10px",
    fontWeight: "900"
  },

  voucherValue: {
    fontSize: "10px",
    color: colors.black,
    fontWeight: "900"
  },

  teyseerNotice: {
    background: "#F7F0DF",
    border: `1px solid ${colors.gold}`,
    borderRadius: "3px",
    padding: "6px 8px",
    margin: "4px 0",
    textAlign: "center"
  },

  teyseerNoticeTitle: {
    fontSize: "8px",
    fontWeight: "900",
    color: colors.black
  },

  teyseerNoticeText: {
    fontSize: "8px",
    fontWeight: "900",
    color: colors.gold,
    marginTop: "2px"
  },

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
    borderLeft: `5px solid ${colors.gold}`
  },

  sectionArabic: {
    fontSize: "10px",
    color: colors.gold
  },

  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    border: `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden"
  },

  vehicleItem: {
    minHeight: "55px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "5px",
    borderRight: `1px solid ${colors.border}`,
    background: "#FEFEFE",
    textAlign: "center"
  },

  vehicleLabel: {
    fontSize: "7px",
    color: colors.gray,
    fontWeight: "900",
    letterSpacing: "0.6px",
    marginBottom: "4px"
  },

  vehicleValue: {
    fontSize: "10px",
    color: colors.black
  },

  vehicleArabic: {
    fontSize: "7px",
    color: colors.black,
    marginTop: "3px"
  },

  serviceTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10px"
  },

  serviceHeader: {
    background: colors.black,
    color: colors.gold,
    border: `1px solid ${colors.black}`,
    padding: "8px 5px",
    textAlign: "center",
    fontSize: "8px",
    letterSpacing: "0.5px"
  },

  serviceCell: {
    border: `1px solid ${colors.border}`,
    padding: "8px 6px",
    textAlign: "center",
    fontSize: "9px",
    color: colors.darkText
  },

  emptyCell: {
    border: `1px solid ${colors.border}`,
    padding: "12px",
    textAlign: "center",
    color: colors.gray
  },

  wttPaidLabel: {
    display: "inline-block",
    marginTop: "3px",
    fontSize: "6.5px",
    color: colors.gold,
    fontWeight: "900",
    letterSpacing: "0.3px"
  },

  paidThroughText: {
    color: colors.gold,
    fontWeight: "900",
    fontSize: "8px"
  },

  totalArea: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "10px"
  },

  totalBox: {
    width: "48%",
    border: `1px solid ${colors.border}`,
    borderRadius: "3px",
    overflow: "hidden"
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px",
    fontSize: "10px",
    fontWeight: "900",
    borderBottom: `2px solid ${colors.gold}`
  },

  ppfBox: {
    marginTop: "10px",
    border: `1px solid ${colors.gold}`,
    borderRadius: "3px",
    overflow: "hidden"
  },

  ppfTitle: {
    background: colors.black,
    color: colors.gold,
    fontSize: "9px",
    fontWeight: "900",
    padding: "7px 9px",
    borderBottom: `1px solid ${colors.gold}`
  },

  ppfContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 15px",
    padding: "8px 9px",
    fontSize: "8px",
    lineHeight: "1.3"
  },

  signatureArea: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "70px",
    marginTop: "18px"
  },

  signatureBox: {
    textAlign: "center"
  },

  signatureTitle: {
    fontSize: "8px",
    color: colors.black,
    fontWeight: "900"
  },

  signatureLine: {
    borderBottom: `1px solid ${colors.black}`,
    marginTop: "28px"
  },

  signatureSub: {
    fontSize: "8px",
    color: colors.gray,
    marginTop: "3px"
  },

  footer: {
    position: "absolute",
    bottom: "7mm",
    left: "8mm",
    right: "8mm",
    textAlign: "center",
    fontSize: "8px",
    color: colors.gray,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "5px"
  },

  termsPage: {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    background: colors.white,
    margin: "0 auto",
    padding: "8mm",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    fontSize: "10px",
    lineHeight: "1.28"
  },

  termsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "4px 5px 8px"
  },

  termsLogo: {
    width: "75px",
    height: "58px",
    objectFit: "contain"
  },

  termsMainTitle: {
    margin: "0",
    fontSize: "21px",
    color: colors.black,
    letterSpacing: "0.8px",
    fontWeight: "900"
  },

  termsArabicTitle: {
    margin: "4px 0 0",
    fontSize: "16px",
    color: colors.gold
  },

  termsDivider: {
    height: "2px",
    background: `linear-gradient(90deg, ${colors.black}, ${colors.gold})`,
    margin: "4px 0 10px"
  },

  termsSection: {
    padding: "0 4px"
  },

  termsHeading: {
    color: colors.gold,
    fontSize: "14px",
    fontWeight: "900",
    margin: "7px 0 4px",
    borderLeft: `4px solid ${colors.gold}`,
    paddingLeft: "7px"
  },

  arabicTerms: {
    padding: "0 4px",
    textAlign: "right"
  },

  arabicTermsHeading: {
    color: colors.gold,
    fontSize: "14px",
    fontWeight: "900",
    margin: "7px 0 4px",
    borderRight: `4px solid ${colors.gold}`,
    paddingRight: "7px"
  },

  termsParagraph: {
    margin: "4px 0",
    fontSize: "8.8px"
  },

  termsFooter: {
    position: "absolute",
    bottom: "7mm",
    left: "8mm",
    right: "8mm",
    textAlign: "center",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "5px",
    fontSize: "7px",
    color: colors.gray
  },

  printButton: {
    position: "fixed",
    right: "25px",
    bottom: "25px",
    background: colors.black,
    color: colors.gold,
    border: `1px solid ${colors.gold}`,
    padding: "13px 24px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    zIndex: 9999
  }
};

// =========================================================
// PRINT CSS
// =========================================================

if (typeof document !== "undefined") {
  const existingStyle = document.getElementById(
    "professional-invoice-print-style"
  );

  if (!existingStyle) {
    const printStyle = document.createElement("style");

    printStyle.id = "professional-invoice-print-style";

    printStyle.innerHTML = `
      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html, body {
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

        table, tr, img {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }
      }

      @media screen and (max-width: 800px) {
        .invoice-page, .terms-page {
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
