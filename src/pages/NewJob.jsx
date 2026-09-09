import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

function NewJob() {
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
  // TEYSEER CHECK
  // ============================================

  function isTeyseerSource(sourceName) {
    return (
      sourceName === "Teyseer Motors" ||
      sourceName === "Teyseer Motors - Bahaa" ||
      sourceName === "Teyseer Motors - Salah"
    );
  }

  function isWttService(serviceName) {
    return serviceName
      ?.toLowerCase()
      .includes("wtt");
  }

  // ============================================
  // LOAD SERVICES
  // ============================================

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*");

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
      .eq("active", true);

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
  //
  // This is the internal total.
  // It can include WTT.
  // ============================================

  const total = services.reduce((sum, serviceName) => {
    const details = serviceDetails[serviceName] || {};

    const price = Number(details.price || 0);
    const quantity = Number(details.quantity || 1);
    const serviceDiscount = Number(details.discount || 0);

    return (
      sum +
      Math.max(
        price * quantity - serviceDiscount,
        0
      )
    );
  }, 0);

  // ============================================
  // CUSTOMER PAYABLE TOTAL
  //
  // IMPORTANT:
  //
  // If this is a Teyseer job:
  // WTT is paid by Teyseer.
  //
  // Therefore WTT is excluded from the
  // customer's payable amount.
  // ============================================

  const customerServicesTotal = services.reduce(
    (sum, serviceName) => {
      const details =
        serviceDetails[serviceName] || {};

      // WTT is paid by Teyseer
      if (
        isTeyseerSource(source) &&
        isWttService(serviceName)
      ) {
        return sum;
      }

      const price = Number(details.price || 0);
      const quantity = Number(details.quantity || 1);
      const serviceDiscount =
        Number(details.discount || 0);

      return (
        sum +
        Math.max(
          price * quantity - serviceDiscount,
          0
        )
      );
    },
    0
  );

  // ============================================
  // FINAL CUSTOMER NET AMOUNT
  //
  // This is what the customer actually pays.
  // ============================================

  const finalNetAmount = Math.max(
    customerServicesTotal -
      Number(discount || 0),
    0
  );

  // ============================================
  // CUSTOMER BALANCE
  //
  // Deposit is only against customer's amount.
  // WTT is NOT part of this.
  // ============================================

  const finalBalance = Math.max(
    finalNetAmount -
      Number(deposit || 0),
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
    } else {
      setServices((prev) => [
        ...prev,
        service,
      ]);

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
  // SAVE JOB
  // ============================================

  async function saveJob() {
    // --------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------

    if (!customer.trim()) {
      alert("Please enter customer name.");
      return;
    }

    // --------------------------------------------
    // TEYSEER VOUCHER VALIDATION
    // --------------------------------------------

    const isTeyseer = isTeyseerSource(source);

    if (isTeyseer && !voucherNumber.trim()) {
      alert(
        "Please enter the Teyseer Voucher Number."
      );
      return;
    }

    // --------------------------------------------
    // GET NEXT RECEIPT NUMBER
    // --------------------------------------------

    const {
      data: lastJob,
      error: receiptError,
    } = await supabase
      .from("jobs")
      .select("receipt_number")
      .not("receipt_number", "is", null)
      .order("receipt_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (receiptError) {
      console.error(
        "RECEIPT NUMBER ERROR:",
        receiptError
      );

      alert(receiptError.message);
      return;
    }

    const nextReceiptNumber =
      lastJob?.receipt_number
        ? Number(lastJob.receipt_number) + 1
        : 2718;

    // --------------------------------------------
    // PAYMENT METHOD
    // --------------------------------------------

    const savedPaymentMethod =
      paymentMethod &&
      paymentMethod.trim() !== ""
        ? paymentMethod
        : null;

    // --------------------------------------------
    // SOURCE
    // --------------------------------------------

    const savedSource =
      source === "Other"
        ? otherSource
        : source;

    // --------------------------------------------
    // CREATE JOB
    // --------------------------------------------

    const job = {
      customer,

      phone,

      date,

      receipt_number:
        nextReceiptNumber,

      source: savedSource,

      // KEEP TEYSEER VOUCHER NUMBER
      voucherNumber: isTeyseer
        ? voucherNumber
        : "",

      carModel,

      carType,

      color,

      chassis,

      plate,

      services,

      serviceDetails,

      paymentMethod:
        savedPaymentMethod,

      // INTERNAL TOTAL OF ALL SERVICES
      price: Number(total),

      discount:
        Number(discount || 0),

      // CUSTOMER'S ACTUAL DEPOSIT
      deposit:
        Number(deposit || 0),

      // CUSTOMER'S BALANCE
      // WTT IS ALREADY PAID BY TEYSEER
      balance:
        Number(finalBalance),

      status: "New",
    };

    console.log(
      "JOB TO SAVE:",
      job
    );

    // --------------------------------------------
    // INSERT JOB
    // --------------------------------------------

    const {
      data: jobData,
      error: jobError,
    } = await supabase
      .from("jobs")
      .insert([job])
      .select()
      .single();

    if (jobError) {
      console.error(
        "JOB ERROR:",
        jobError
      );

      alert(jobError.message);
      return;
    }

    // --------------------------------------------
    // CREATE CUSTOMER PAYMENT
    //
    // ONLY THE CUSTOMER'S DEPOSIT.
    //
    // NO TEYSEER MONTHLY PAYMENT IS CREATED.
    // --------------------------------------------

    if (Number(deposit) > 0) {
      const {
        error: paymentError,
      } = await supabase
        .from("payments")
        .insert([
          {
            job_id: jobData.id,

            amount:
              Number(deposit),

            payment_method:
              savedPaymentMethod,

            payment_source:
              savedSource,

            payment_date:
              new Date(),

            notes:
              "Customer payment",
          },
        ]);

      if (paymentError) {
        console.error(
          "PAYMENT ERROR:",
          paymentError
        );
      }
    }

    // --------------------------------------------
    // CREATE JOB SERVICES
    //
    // WTT = TEYSEER
    // EVERYTHING ELSE = SALES TEAM
    // --------------------------------------------

    for (const serviceName of services) {
      const details =
        serviceDetails[serviceName] || {};

      let owner = "Sales Team";

      if (
        isTeyseer &&
        isWttService(serviceName)
      ) {
        owner = "Teyseer";
      }

      const {
        data: serviceRow,
        error: serviceError,
      } = await supabase
        .from("job_services")
        .insert([
          {
            job_id:
              jobData.id,

            service_name:
              serviceName,

            price:
              Number(
                details.price || 0
              ),

            discount:
              Number(
                details.discount || 0
              ),

            owner,
          },
        ])
        .select()
        .single();

      if (serviceError) {
        console.error(
          "SERVICE ERROR:",
          serviceError
        );

        continue;
      }

      // ------------------------------------------
      // TECHNICIANS
      // ------------------------------------------

      const techRows =
        (details.technicians || []).map(
          (technician) => ({
            service_id:
              serviceRow.id,

            technician_id:
              technician.id,

            commission:
              Number(
                technician.commission || 0
              ),
          })
        );

      if (techRows.length > 0) {
        const {
          error: techError,
        } = await supabase
          .from(
            "service_technicians"
          )
          .insert(techRows);

        if (techError) {
          console.error(
            "TECHNICIAN ERROR:",
            techError
          );
        }
      }
    }

    // --------------------------------------------
    // SUCCESS MESSAGE
    // --------------------------------------------

    let successMessage =
      `Job Saved Successfully!\n\n` +
      `Receipt Number: ${nextReceiptNumber}\n\n`;

    if (isTeyseer) {
      successMessage +=
        `Teyseer Voucher: ${voucherNumber}\n\n` +
        `WTT: Paid through Teyseer\n\n` +
        `Customer Net Amount: QAR ${finalNetAmount.toFixed(
          2
        )}`;
    } else {
      successMessage +=
        `Customer Net Amount: QAR ${finalNetAmount.toFixed(
          2
        )}`;
    }

    alert(successMessage);

    // --------------------------------------------
    // RESET FORM
    // --------------------------------------------

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
      <h1>New Job</h1>

      <div style={styles.form}>

        {/* =====================================
            CUSTOMER
        ====================================== */}

        <h2>
          Customer Information
        </h2>

        <input
          placeholder="Customer Name"
          value={customer}
          onChange={(e) =>
            setCustomer(e.target.value)
          }
        />

        <input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
        />

        <label>
          Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(e.target.value)
          }
        />

        {/* =====================================
            SOURCE
        ====================================== */}

        <h2>
          Source
        </h2>

        <select
          value={source}
          onChange={(e) =>
            setSource(e.target.value)
          }
        >
          <option value="">
            Select Source
          </option>

          <option value="Teyseer Motors">
            Teyseer Motors
          </option>

          <option value="Teyseer Motors - Bahaa">
            Teyseer Motors - Bahaa
          </option>

          <option value="Teyseer Motors - Salah">
            Teyseer Motors - Salah
          </option>

          <option value="Bahaa">
            Bahaa
          </option>

          <option value="Salah">
            Salah
          </option>

          <option value="Walk-in">
            Walk-in
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        {/* OTHER SOURCE */}

        {source === "Other" && (
          <input
            placeholder="Other Source"
            value={otherSource}
            onChange={(e) =>
              setOtherSource(
                e.target.value
              )
            }
          />
        )}

        {/* =====================================
            TEYSEER VOUCHER
        ====================================== */}

        {isTeyseerSource(source) && (
          <div style={styles.teyseerBox}>
            <strong>
              TEYSEER JOB
            </strong>

            <span>
              WTT will be paid through Teyseer.
            </span>

            <input
              placeholder="Teyseer Voucher Number"
              value={voucherNumber}
              onChange={(e) =>
                setVoucherNumber(
                  e.target.value
                )
              }
            />
          </div>
        )}

        {/* =====================================
            VEHICLE
        ====================================== */}

        <h2>
          Vehicle Information
        </h2>

        <input
          placeholder="Car Model"
          value={carModel}
          onChange={(e) =>
            setCarModel(e.target.value)
          }
        />

        <label>
          Car Type
        </label>

        <select
          value={carType}
          onChange={(e) =>
            setCarType(e.target.value)
          }
        >
          <option value="">
            Select Car Type
          </option>

          <option value="GWM">
            GWM
          </option>

          <option value="Suzuki">
            Suzuki
          </option>

          <option value="Toyota">
            Toyota
          </option>

          <option value="Nissan">
            Nissan
          </option>

          <option value="Honda">
            Honda
          </option>

          <option value="Kia">
            Kia
          </option>

          <option value="Hyundai">
            Hyundai
          </option>

          <option value="Ford">
            Ford
          </option>

          <option value="BMW">
            BMW
          </option>

          <option value="Mercedes">
            Mercedes
          </option>

          <option value="Audi">
            Audi
          </option>

          <option value="Dodge">
            Dodge
          </option>

          <option value="Chevrolet">
            Chevrolet
          </option>
        </select>

        <input
          placeholder="Color"
          value={color}
          onChange={(e) =>
            setColor(e.target.value)
          }
        />

        <input
          placeholder="Chassis Number"
          value={chassis}
          onChange={(e) =>
            setChassis(e.target.value)
          }
        />

        <input
          placeholder="Plate Number"
          value={plate}
          onChange={(e) =>
            setPlate(e.target.value)
          }
        />

        {/* =====================================
            SERVICES
        ====================================== */}

        <h2>
          Services
        </h2>

        {serviceList.map(
          (serviceItem) => {
            const service =
              serviceItem.name;

            const isWtt =
              isWttService(service);

            const isTeyseerWtt =
              isTeyseerSource(source) &&
              isWtt;

            return (
              <div
                key={serviceItem.id}
                style={
                  styles.serviceBox
                }
              >
                <label>
                  <input
                    type="checkbox"
                    checked={services.includes(
                      service
                    )}
                    onChange={() =>
                      chooseService(
                        service,
                        serviceItem.price
                      )
                    }
                  />

                  {" "}

                  {service}

                  {/* INTERNAL LABEL ONLY */}

                  {isTeyseerWtt && (
                    <span
                      style={
                        styles.teyseerLabel
                      }
                    >
                      Paid through Teyseer
                    </span>
                  )}
                </label>

                {services.includes(
                  service
                ) && (
                  <div>
                    <br />

                    {/* PRICE */}

                    <input
                      type="number"
                      placeholder="Price"
                      value={
                        serviceDetails?.[
                          service
                        ]?.price || 0
                      }
                      onChange={(e) => {
                        setServiceDetails(
                          (prev) => ({
                            ...prev,

                            [service]: {
                              ...(prev[
                                service
                              ] || {}),

                              price:
                                Number(
                                  e.target.value
                                ),
                            },
                          })
                        );
                      }}
                    />

                    {/* QUANTITY */}

                    <input
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={
                        serviceDetails?.[
                          service
                        ]?.quantity || 1
                      }
                      onChange={(e) => {
                        setServiceDetails(
                          (prev) => ({
                            ...prev,

                            [service]: {
                              ...(prev[
                                service
                              ] || {}),

                              quantity:
                                Number(
                                  e.target.value
                                ) || 1,
                            },
                          })
                        );
                      }}
                    />

                    {/* DISCOUNT */}

                    <input
                      type="number"
                      placeholder="Discount"
                      value={
                        serviceDetails?.[
                          service
                        ]?.discount || 0
                      }
                      onChange={(e) => {
                        setServiceDetails(
                          (prev) => ({
                            ...prev,

                            [service]: {
                              ...(prev[
                                service
                              ] || {}),

                              discount:
                                Number(
                                  e.target.value
                                ),
                            },
                          })
                        );
                      }}
                    />

                    {/* TECHNICIANS */}

                    <h4>
                      Technicians
                    </h4>

                    {technicians.map(
                      (person) => {
                        const selected =
                          serviceDetails[
                            service
                          ]?.technicians?.find(
                            (t) =>
                              t.id ===
                              person.id
                          );

                        return (
                          <div
                            key={
                              person.id
                            }
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={
                                  !!selected
                                }
                                onChange={(
                                  e
                                ) => {
                                  const oldTech =
                                    serviceDetails[
                                      service
                                    ]?.technicians ||
                                    [];

                                  let updated;

                                  if (
                                    e.target
                                      .checked
                                  ) {
                                    updated =
                                      [
                                        ...oldTech,
                                        {
                                          id:
                                            person.id,

                                          commission:
                                            0,
                                        },
                                      ];
                                  } else {
                                    updated =
                                      oldTech.filter(
                                        (t) =>
                                          t.id !==
                                          person.id
                                      );
                                  }

                                  setServiceDetails(
                                    (prev) => ({
                                      ...prev,

                                      [service]: {
                                        ...(prev[
                                          service
                                        ] || {}),

                                        technicians:
                                          updated,
                                      },
                                    })
                                  );
                                }}
                              />

                              {" "}

                              {person.name}
                            </label>

                            {selected && (
                              <input
                                type="number"
                                placeholder="Commission"
                                value={
                                  selected.commission
                                }
                                onChange={(
                                  e
                                ) => {
                                  setServiceDetails(
                                    (prev) => {
                                      const updated =
                                        (
                                          prev[
                                            service
                                          ]
                                            ?.technicians ||
                                          []
                                        ).map(
                                          (t) => {
                                            if (
                                              t.id ===
                                              person.id
                                            ) {
                                              return {
                                                ...t,

                                                commission:
                                                  Number(
                                                    e
                                                      .target
                                                      .value
                                                  ),
                                              };
                                            }

                                            return t;
                                          }
                                        );

                                      return {
                                        ...prev,

                                        [service]: {
                                          ...(prev[
                                            service
                                          ] || {}),

                                          technicians:
                                            updated,
                                        },
                                      };
                                    }
                                  );
                                }}
                              />
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            );
          }
        )}

        {/* =====================================
            PAYMENT
        ====================================== */}

        <h2>
          Payment
        </h2>

        <label>
          Payment Method
          <span
            style={{
              color: "#888",
              fontSize: "12px",
              marginLeft: "8px",
            }}
          >
            Optional — can be added later
          </span>
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(
              e.target.value
            )
          }
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
          onChange={(e) =>
            setDiscount(
              Number(e.target.value)
            )
          }
        />

        <label>
          Customer Deposit Paid
        </label>

        <input
          type="number"
          placeholder="Enter customer deposit"
          value={deposit}
          onChange={(e) =>
            setDeposit(
              Number(e.target.value)
            )
          }
        />

        {/* =====================================
            TOTALS
        ====================================== */}

        <div style={styles.summary}>

          <h3>
            All Services Total: QAR{" "}
            {total.toFixed(2)}
          </h3>

          {isTeyseerSource(source) && (
            <p style={styles.teyseerNotice}>
              WTT is paid through Teyseer and is
              excluded from the customer's amount.
            </p>
          )}

          <h3>
            Customer Net Amount: QAR{" "}
            {finalNetAmount.toFixed(2)}
          </h3>

          <h3>
            Customer Balance: QAR{" "}
            {finalBalance.toFixed(2)}
          </h3>

        </div>

        {/* =====================================
            SAVE
        ====================================== */}

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

// ============================================
// STYLES — DARK BLACK & GOLD THEME ONLY
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