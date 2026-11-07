import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/client";

// ============================================
// NEW JOB TRANSLATIONS
// ============================================

const newJobTranslations = {
  ar: {
    "New Job": "وظيفة جديدة",
    "Customer Information": "معلومات العميل",
    "Customer Name": "اسم العميل",
    "Phone Number": "رقم الهاتف",
    "Date": "التاريخ",
    "Source": "المصدر",
    "Select Source": "اختر المصدر",
    "Other": "أخرى",
    "Walk-in": "عميل مباشر",
    "Other Source": "مصدر آخر",
    "TEYSEER JOB": "طلب تيسير",
    "WTT will be paid through Teyseer.": "سيتم دفع خدمة WTT عن طريق تيسير.",
    "Teyseer Voucher Number": "رقم قسيمة تيسير",
    "Vehicle Information": "معلومات المركبة",
    "Car Model": "موديل السيارة",
    "Car Type": "نوع السيارة",
    "Select Car Type": "اختر نوع السيارة",
    "Color": "اللون",
    "Chassis Number": "رقم الشاسيه",
    "Plate Number": "رقم اللوحة",
    "Services": "الخدمات",
    "Paid through Teyseer": "مدفوع عن طريق تيسير",
    "Price": "السعر",
    "Quantity": "الكمية",
    "Discount": "الخصم",
    "Technicians": "الفنيون",
    "Commission": "العمولة",
    "Payment": "الدفع",
    "Payment Method": "طريقة الدفع",
    "Optional — can be added later": "اختياري — يمكن إضافته لاحقاً",
    "Select Payment Method": "اختر طريقة الدفع",
    "Cash": "نقداً",
    "Visa": "فيزا",
    "Mastercard": "ماستركارد",
    "PayLater": "الدفع لاحقاً",
    "Enter discount": "أدخل الخصم",
    "Customer Deposit Paid": "الدفعة المقدمة من العميل",
    "Enter customer deposit": "أدخل دفعة العميل",
    "All Services Total: QAR": "إجمالي جميع الخدمات: ر.ق",
    "All services are paid through Teyseer and excluded from the customer's amount.":
      "جميع الخدمات مدفوعة عن طريق تيسير ومستثناة من المبلغ المستحق على العميل.",
    "WTT is paid through Teyseer and excluded from the customer's amount.":
      "خدمة WTT مدفوعة عن طريق تيسير ومستثناة من المبلغ المستحق على العميل.",
    "Customer Net Amount: QAR": "صافي مبلغ العميل: ر.ق",
    "Customer Balance: QAR": "رصيد العميل: ر.ق",
    "SAVE JOB": "حفظ الطلب",
    "Please enter customer name.": "يرجى إدخال اسم العميل.",
    "Please enter the Teyseer Voucher Number.":
      "يرجى إدخال رقم قسيمة تيسير.",
    "Shop ID not found. Please log in again.":
      "لم يتم العثور على معرف المتجر. يرجى تسجيل الدخول مرة أخرى.",
    "Job Saved Successfully!": "تم حفظ الطلب بنجاح!",
    "Receipt Number:": "رقم الإيصال:",
    "Teyseer Voucher:": "قسيمة تيسير:",
    "All Services: Paid through Teyseer":
      "جميع الخدمات: مدفوعة عن طريق تيسير",
    "WTT: Paid through Teyseer": "WTT: مدفوعة عن طريق تيسير",
  },

  zh: {
    "New Job": "新建工单",
    "Customer Information": "客户信息",
    "Customer Name": "客户姓名",
    "Phone Number": "电话号码",
    "Date": "日期",
    "Source": "客户来源",
    "Select Source": "选择来源",
    "Other": "其他",
    "Walk-in": "直接到店客户",
    "Other Source": "其他来源",
    "TEYSEER JOB": "Teyseer 工单",
    "WTT will be paid through Teyseer.": "WTT 服务费用将由 Teyseer 支付。",
    "Teyseer Voucher Number": "Teyseer 凭证号码",
    "Vehicle Information": "车辆信息",
    "Car Model": "汽车型号",
    "Car Type": "车辆品牌",
    "Select Car Type": "选择车辆品牌",
    "Color": "颜色",
    "Chassis Number": "底盘号码",
    "Plate Number": "车牌号码",
    "Services": "服务项目",
    "Paid through Teyseer": "由 Teyseer 支付",
    "Price": "价格",
    "Quantity": "数量",
    "Discount": "折扣",
    "Technicians": "技术人员",
    "Commission": "佣金",
    "Payment": "付款",
    "Payment Method": "付款方式",
    "Optional — can be added later": "可选 — 可以稍后添加",
    "Select Payment Method": "选择付款方式",
    "Cash": "现金",
    "Visa": "Visa",
    "Mastercard": "Mastercard",
    "PayLater": "稍后付款",
    "Enter discount": "输入折扣",
    "Customer Deposit Paid": "客户已付订金",
    "Enter customer deposit": "输入客户订金",
    "All Services Total: QAR": "所有服务总额：QAR",
    "All services are paid through Teyseer and excluded from the customer's amount.":
      "所有服务均由 Teyseer 支付，不计入客户应付金额。",
    "WTT is paid through Teyseer and excluded from the customer's amount.":
      "WTT 服务由 Teyseer 支付，不计入客户应付金额。",
    "Customer Net Amount: QAR": "客户净金额：QAR",
    "Customer Balance: QAR": "客户余额：QAR",
    "SAVE JOB": "保存工单",
    "Please enter customer name.": "请输入客户姓名。",
    "Please enter the Teyseer Voucher Number.":
      "请输入 Teyseer 凭证号码。",
    "Shop ID not found. Please log in again.":
      "未找到店铺 ID，请重新登录。",
    "Job Saved Successfully!": "工单保存成功！",
    "Receipt Number:": "收据号码：",
    "Teyseer Voucher:": "Teyseer 凭证：",
    "All Services: Paid through Teyseer":
      "所有服务：由 Teyseer 支付",
    "WTT: Paid through Teyseer": "WTT：由 Teyseer 支付",
  },
};

// ============================================
// TRANSLATION HELPER
// ============================================

function translateNewJob(text, language) {
  if (language === "ar" || language === "zh") {
    return newJobTranslations[language]?.[text] || text;
  }

  return text;
}

// ============================================
// NEW JOB COMPONENT
// ============================================

function NewJob() {
  const { i18n } = useTranslation();

  const language =
    i18n.resolvedLanguage || i18n.language || "en";

  const tr = (text) => translateNewJob(text, language);

  const today = new Date().toISOString().split("T")[0];

  // ============================================
  // CUSTOMER
  // ============================================

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today);

  // ============================================
  // SOURCE
  // ============================================

  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");

  // ============================================
  // VEHICLE
  // ============================================

  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [plate, setPlate] = useState("");

  // ============================================
  // SERVICES
  // ============================================

  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});

  // ============================================
  // PAYMENT
  // ============================================

  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");

  // ============================================
  // TECHNICIANS
  // ============================================

  const [technicians, setTechnicians] = useState([]);
  const [serviceList, setServiceList] = useState([]);

  // ============================================
  // SOURCE HELPERS
  // ============================================

  function normalizeSource(sourceName) {
    return String(sourceName || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isPureTeyseerSource(sourceName) {
    return normalizeSource(sourceName) === "teyseer motors";
  }

  function isTeyseerSalahSource(sourceName) {
    const value = normalizeSource(sourceName);

    return (
      value === "teyseer motors - salah" ||
      value === "teyseer motors-salah" ||
      value === "teyseer-salah"
    );
  }

  function isTeyseerBahaaSource(sourceName) {
    const value = normalizeSource(sourceName);

    return (
      value === "teyseer motors - bahaa" ||
      value === "teyseer motors-bahaa" ||
      value === "teyseer-bahaa"
    );
  }

  function isTeyseerSource(sourceName) {
    return (
      isPureTeyseerSource(sourceName) ||
      isTeyseerSalahSource(sourceName) ||
      isTeyseerBahaaSource(sourceName)
    );
  }

  function isWttService(serviceName) {
    return String(serviceName || "")
      .toLowerCase()
      .includes("wtt");
  }

  // ============================================
  // LOAD SERVICES
  // ============================================

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");

    if (error) {
      console.error("SERVICES ERROR:", error);
      return;
    }

    setServiceList(data || []);
  }

  // ============================================
  // LOAD TECHNICIANS
  // ============================================

  async function loadTechnicians() {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("TECHNICIANS ERROR:", error);
      return;
    }

    setTechnicians(data || []);
  }

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    loadTechnicians();
    loadServices();
  }, []);

  // ============================================
  // TOTAL OF ALL SERVICES
  // ============================================

  const total = services.reduce((sum, serviceName) => {
    const details = serviceDetails[serviceName] || {};

    const price = Number(details.price || 0);
    const quantity = Number(details.quantity || 1);
    const serviceDiscount = Number(details.discount || 0);

    const amount = price * quantity;

    return sum + amount;
  }, 0);

  // ============================================
  // CUSTOMER SERVICES TOTAL
  // ============================================

  const customerServicesTotal = services.reduce(
    (sum, serviceName) => {
      const details = serviceDetails[serviceName] || {};

      if (isPureTeyseerSource(source)) {
        return sum;
      }

      if (
        isTeyseerSource(source) &&
        isWttService(serviceName)
      ) {
        return sum;
      }

      const price = Number(details.price || 0);
      const quantity = Number(details.quantity || 1);
      const serviceDiscount = Number(details.discount || 0);

      const amount = Math.max(
        price * quantity - serviceDiscount,
        0
      );

      return sum + amount;
    },
    0
  );

  // ============================================
  // CUSTOMER NET AMOUNT
  // ============================================

  const finalNetAmount = Math.max(
    customerServicesTotal - Number(discount || 0),
    0
  );

  // ============================================
  // CUSTOMER BALANCE
  // ============================================

  const finalBalance = Math.max(
    finalNetAmount - Number(deposit || 0),
    0
  );

  // ============================================
  // CHOOSE SERVICE
  // ============================================

  function chooseService(service, price) {
    if (services.includes(service)) {
      setServices((prev) =>
        prev.filter((s) => s !== service)
      );

      setServiceDetails((prev) => {
        const copy = { ...prev };
        delete copy[service];
        return copy;
      });

      return;
    }

    setServices((prev) => [...prev, service]);

    setServiceDetails((prev) => ({
      ...prev,
      [service]: {
        price: Number(price || 0),
        discount: 0,
        quantity: 1,
        technicians: [],
      },
    }));
  }

  // ============================================
  // TEYSEER WTT PRICE
  // ============================================

  useEffect(() => {
    const isTeyseer = isTeyseerSource(source);

    if (
      !isTeyseer ||
      !services.includes("Full WTT")
    ) {
      return;
    }

    let price = null;

    if (carType === "GWM") {
      price = 1000;
    }

    if (carType === "Suzuki") {
      price = 800;
    }

    if (carType === "Peugot") {
      price = 1000;
    }

    if (price === null) {
      return;
    }

    setServiceDetails((prev) => ({
      ...prev,
      "Full WTT": {
        ...prev["Full WTT"],
        price,
      },
    }));
  }, [source, carType, services]);

  // ============================================
  // GET SERVICE OWNER
  // ============================================

  function getServiceOwner(sourceName, serviceName) {
    const sourceValue = normalizeSource(sourceName);
    const isWtt = isWttService(serviceName);

    if (isPureTeyseerSource(sourceValue)) {
      return "Teyseer";
    }

    if (isTeyseerSalahSource(sourceValue)) {
      return isWtt ? "Teyseer" : "Salah";
    }

    if (isTeyseerBahaaSource(sourceValue)) {
      return isWtt ? "Teyseer" : "Bahaa";
    }

    if (sourceValue === "salah") {
      return "Salah";
    }

    if (sourceValue === "bahaa") {
      return "Bahaa";
    }

    return "Sales Team";
  }

  // ============================================
  // SAVE JOB
  // ============================================

  async function saveJob() {
    if (!customer.trim()) {
      alert(tr("Please enter customer name."));
      return;
    }

    const isTeyseer = isTeyseerSource(source);

    if (isTeyseer && !voucherNumber.trim()) {
      alert(tr("Please enter the Teyseer Voucher Number."));
      return;
    }

    const loggedInUser = JSON.parse(
      localStorage.getItem("user")
    );

    const shopId = loggedInUser?.shop_id;

    if (!shopId) {
      alert(tr("Shop ID not found. Please log in again."));
      return;
    }

    // ==========================================
    // NEXT RECEIPT NUMBER
    // ==========================================

    const {
      data: lastJob,
      error: receiptError,
    } = await supabase
      .from("jobs")
      .select("receipt_number")
      .eq("shop_id", shopId)
      .not("receipt_number", "is", null)
      .order("receipt_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (receiptError) {
      console.error("RECEIPT NUMBER ERROR:", receiptError);
      alert(receiptError.message);
      return;
    }

    const nextReceiptNumber =
      lastJob?.receipt_number
        ? Number(lastJob.receipt_number) + 1
        : 2718;

    // ==========================================
    // PAYMENT METHOD
    // ==========================================

    const savedPaymentMethod =
      paymentMethod && paymentMethod.trim() !== ""
        ? paymentMethod
        : null;

    // ==========================================
    // SOURCE
    // ==========================================

    const savedSource =
      source === "Other"
        ? otherSource.trim()
        : source;

    // ==========================================
    // CREATE JOB
    // ==========================================

    const job = {
      shop_id: shopId,

      customer,
      phone,
      date,

      receipt_number: nextReceiptNumber,

      source: savedSource,

      voucherNumber: isTeyseer ? voucherNumber : "",

      carModel,
      carType,
      color,
      chassis,
      plate,

      services,
      serviceDetails,

      paymentMethod: savedPaymentMethod,

      price: Number(total),

      discount: Number(discount || 0),

      deposit: Number(deposit || 0),

      balance: Number(finalBalance),

      status: "New",
    };

    console.log("JOB TO SAVE:", job);

    // ==========================================
    // INSERT JOB
    // ==========================================

    const {
      data: jobData,
      error: jobError,
    } = await supabase
      .from("jobs")
      .insert([job])
      .select()
      .single();

    if (jobError) {
      console.error("JOB ERROR:", jobError);
      alert(jobError.message);
      return;
    }

    // ==========================================
    // CUSTOMER PAYMENT
    // ==========================================

    if (Number(deposit) > 0) {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([
          {
            job_id: jobData.id,

            amount: Number(deposit),

            payment_method: savedPaymentMethod,

            payment_source: savedSource,

            payment_date: new Date(),

            notes: "Customer payment",
          },
        ]);

      if (paymentError) {
        console.error("PAYMENT ERROR:", paymentError);
      }
    }

    // ==========================================
    // CREATE JOB SERVICES
    // ==========================================

    for (const serviceName of services) {
      const details = serviceDetails[serviceName] || {};

      const owner = getServiceOwner(
        savedSource,
        serviceName
      );

      const {
        data: serviceRow,
        error: serviceError,
      } = await supabase
        .from("job_services")
        .insert([
          {
            job_id: jobData.id,

            service_name: serviceName,

            price: Number(details.price || 0),

            discount: Number(details.discount || 0),

            owner,
          },
        ])
        .select()
        .single();

      if (serviceError) {
        console.error("SERVICE ERROR:", serviceError);
        continue;
      }

      // ========================================
      // TECHNICIANS
      // ========================================

      const techRows = (
        details.technicians || []
      ).map((technician) => ({
        service_id: serviceRow.id,

        technician_id: technician.id,

        commission: Number(technician.commission || 0),
      }));

      if (techRows.length > 0) {
        const { error: techError } = await supabase
          .from("service_technicians")
          .insert(techRows);

        if (techError) {
          console.error("TECHNICIAN ERROR:", techError);
        }
      }
    }

    // ============================================
    // SUCCESS
    // ============================================

    let successMessage =
      `${tr("Job Saved Successfully!")}\n\n` +
      `${tr("Receipt Number:")} ${nextReceiptNumber}\n\n`;

    if (isTeyseer) {
      successMessage +=
        `${tr("Teyseer Voucher:")} ${voucherNumber}\n\n` +
        (isPureTeyseerSource(savedSource)
          ? `${tr("All Services: Paid through Teyseer")}\n\n`
          : `${tr("WTT: Paid through Teyseer")}\n\n`) +
        `${tr("Customer Net Amount: QAR")} ${finalNetAmount.toFixed(2)}`;
    } else {
      successMessage +=
        `${tr("Customer Net Amount: QAR")} ${finalNetAmount.toFixed(2)}`;
    }

    alert(successMessage);

    // ============================================
    // RESET
    // ============================================

    setCustomer("");
    setPhone("");
    setDate(today);

    setSource("");
    setOtherSource("");
    setVoucherNumber("");

    setCarModel("");
    setCarType("");
    setColor("");
    setChassis("");
    setPlate("");

    setServices([]);
    setServiceDetails({});

    setDeposit(0);
    setDiscount(0);
    setPaymentMethod("");
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={styles.page}>
      <h1>{tr("New Job")}</h1>

      <div style={styles.form}>
        <h2>{tr("Customer Information")}</h2>

        <input
          placeholder={tr("Customer Name")}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />

        <input
          placeholder={tr("Phone Number")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label>{tr("Date")}</label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <h2>{tr("Source")}</h2>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">{tr("Select Source")}</option>

          <option value="Teyseer Motors">
            Teyseer Motors
          </option>

          <option value="Teyseer Motors - Bahaa">
            Teyseer Motors - Bahaa
          </option>

          <option value="Teyseer Motors - Salah">
            Teyseer Motors - Salah
          </option>

          <option value="Bahaa">Bahaa</option>

          <option value="Salah">Salah</option>

          <option value="Walk-in">{tr("Walk-in")}</option>

          <option value="Other">{tr("Other")}</option>
        </select>

        {source === "Other" && (
          <input
            placeholder={tr("Other Source")}
            value={otherSource}
            onChange={(e) => setOtherSource(e.target.value)}
          />
        )}

        {isTeyseerSource(source) && (
          <div style={styles.teyseerBox}>
            <strong>{tr("TEYSEER JOB")}</strong>

            <span>{tr("WTT will be paid through Teyseer.")}</span>

            <input
              placeholder={tr("Teyseer Voucher Number")}
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
            />
          </div>
        )}

        <h2>{tr("Vehicle Information")}</h2>

        <input
          placeholder={tr("Car Model")}
          value={carModel}
          onChange={(e) => setCarModel(e.target.value)}
        />

        <label>{tr("Car Type")}</label>

        <select
          value={carType}
          onChange={(e) => setCarType(e.target.value)}
        >
          <option value="">{tr("Select Car Type")}</option>

          <option value="GWM">GWM</option>
          <option value="Suzuki">Suzuki</option>
          <option value="Peugot">Peugot</option>
          <option value="Toyota">Toyota</option>
          <option value="Nissan">Nissan</option>
          <option value="Honda">Honda</option>
          <option value="Kia">Kia</option>
          <option value="Hyundai">Hyundai</option>
          <option value="Ford">Ford</option>
          <option value="BMW">BMW</option>
          <option value="Mercedes">Mercedes</option>
          <option value="Audi">Audi</option>
          <option value="Dodge">Dodge</option>
          <option value="Chevrolet">Chevrolet</option>
        </select>

        <input
          placeholder={tr("Color")}
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <input
          placeholder={tr("Chassis Number")}
          value={chassis}
          onChange={(e) => setChassis(e.target.value)}
        />

        <input
          placeholder={tr("Plate Number")}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />

        <h2>{tr("Services")}</h2>

        {serviceList.map((serviceItem) => {
          const service = serviceItem.name;

          const isWtt = isWttService(service);

          const isTeyseerPaidService =
            isPureTeyseerSource(source) ||
            (isTeyseerSource(source) && isWtt);

          return (
            <div
              key={serviceItem.id}
              style={styles.serviceBox}
            >
              <label>
                <input
                  type="checkbox"
                  checked={services.includes(service)}
                  onChange={() =>
                    chooseService(service, serviceItem.price)
                  }
                />

                {" "}

                {service}

                {isTeyseerPaidService && (
                  <span style={styles.teyseerLabel}>
                    {tr("Paid through Teyseer")}
                  </span>
                )}
              </label>

              {services.includes(service) && (
                <div>
                  <br />

                  <input
                    type="number"
                    placeholder={tr("Price")}
                    value={
                      serviceDetails?.[service]?.price || 0
                    }
                    onChange={(e) => {
                      setServiceDetails((prev) => ({
                        ...prev,

                        [service]: {
                          ...(prev[service] || {}),
                          price: Number(e.target.value),
                        },
                      }));
                    }}
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder={tr("Quantity")}
                    value={
                      serviceDetails?.[service]?.quantity || 1
                    }
                    onChange={(e) => {
                      setServiceDetails((prev) => ({
                        ...prev,

                        [service]: {
                          ...(prev[service] || {}),
                          quantity: Number(e.target.value) || 1,
                        },
                      }));
                    }}
                  />

                  <input
                    type="number"
                    placeholder={tr("Discount")}
                    value={
                      serviceDetails?.[service]?.discount || 0
                    }
                    onChange={(e) => {
                      setServiceDetails((prev) => ({
                        ...prev,

                        [service]: {
                          ...(prev[service] || {}),
                          discount: Number(e.target.value),
                        },
                      }));
                    }}
                  />

                  <h4>{tr("Technicians")}</h4>

                  {technicians.map((person) => {
                    const selected =
                      serviceDetails[service]?.technicians?.find(
                        (t) => t.id === person.id
                      );

                    return (
                      <div key={person.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={(e) => {
                              const oldTech =
                                serviceDetails[service]?.technicians || [];

                              let updated;

                              if (e.target.checked) {
                                updated = [
                                  ...oldTech,
                                  {
                                    id: person.id,
                                    commission: 0,
                                  },
                                ];
                              } else {
                                updated = oldTech.filter(
                                  (t) => t.id !== person.id
                                );
                              }

                              setServiceDetails((prev) => ({
                                ...prev,

                                [service]: {
                                  ...(prev[service] || {}),
                                  technicians: updated,
                                },
                              }));
                            }}
                          />

                          {" "}

                          {person.name}
                        </label>

                        {selected && (
                          <input
                            type="number"
                            placeholder={tr("Commission")}
                            value={selected.commission}
                            onChange={(e) => {
                              setServiceDetails((prev) => {
                                const updated = (
                                  prev[service]?.technicians || []
                                ).map((t) => {
                                  if (t.id === person.id) {
                                    return {
                                      ...t,
                                      commission: Number(e.target.value),
                                    };
                                  }

                                  return t;
                                });

                                return {
                                  ...prev,

                                  [service]: {
                                    ...(prev[service] || {}),
                                    technicians: updated,
                                  },
                                };
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <h2>{tr("Payment")}</h2>

        <label>
          {tr("Payment Method")}

          <span
            style={{
              color: "#888",
              fontSize: "12px",
              marginLeft: "8px",
            }}
          >
            {tr("Optional — can be added later")}
          </span>
        </label>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">{tr("Select Payment Method")}</option>

          <option value="Cash">{tr("Cash")}</option>
          <option value="Visa">Visa</option>
          <option value="Mastercard">Mastercard</option>
          <option value="PayLater">{tr("PayLater")}</option>
        </select>

        <label>{tr("Discount")}</label>

        <input
          type="number"
          placeholder={tr("Enter discount")}
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
        />

        <label>{tr("Customer Deposit Paid")}</label>

        <input
          type="number"
          placeholder={tr("Enter customer deposit")}
          value={deposit}
          onChange={(e) => setDeposit(Number(e.target.value))}
        />

        <div style={styles.summary}>
          <h3>
            {tr("All Services Total: QAR")}{" "}
            {total.toFixed(2)}
          </h3>

          {isTeyseerSource(source) && (
            <p style={styles.teyseerNotice}>
              {isPureTeyseerSource(source)
                ? tr(
                    "All services are paid through Teyseer and excluded from the customer's amount."
                  )
                : tr(
                    "WTT is paid through Teyseer and excluded from the customer's amount."
                  )}
            </p>
          )}

          <h3>
            {tr("Customer Net Amount: QAR")}{" "}
            {finalNetAmount.toFixed(2)}
          </h3>

          <h3>
            {tr("Customer Balance: QAR")}{" "}
            {finalBalance.toFixed(2)}
          </h3>
        </div>

        <button
          type="button"
          onClick={saveJob}
          style={styles.button}
        >
          {tr("SAVE JOB")}
        </button>
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#0b0b0b",
    color: "#f5f5f5",
    boxSizing: "border-box",
  },

  form: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    background: "#151515",
    padding: "25px",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxSizing: "border-box",
  },

  serviceBox: {
    border: "1px solid #444",
    background: "#1d1d1d",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "8px",
  },

  teyseerBox: {
    background: "#1c190f",
    border: "1px solid #d4af37",
    padding: "14px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#f5f5f5",
  },

  teyseerLabel: {
    marginLeft: "10px",
    color: "#d4af37",
    fontSize: "12px",
    fontWeight: "700",
  },

  teyseerNotice: {
    background: "#1c190f",
    color: "#d4af37",
    padding: "10px",
    border: "1px solid #3b321c",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },

  summary: {
    background: "#111",
    border: "2px solid #d4af37",
    borderRadius: "12px",
    padding: "18px",
    marginTop: "10px",
    color: "#f5f5f5",
  },

  button: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "15px 20px",
    borderRadius: "10px",
    fontSize: "17px",
    cursor: "pointer",
    fontWeight: "700",
    marginTop: "5px",
  },
};

export default NewJob;