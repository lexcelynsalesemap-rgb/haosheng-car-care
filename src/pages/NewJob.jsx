import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

function NewJob() {
  const today = new Date().toISOString().split("T")[0];

  // ==========================================
  // CUSTOMER
  // ==========================================

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today);

  // ==========================================
  // SOURCE
  // ==========================================

  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");

  // ==========================================
  // VEHICLE
  // ==========================================

  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [plate, setPlate] = useState("");

  // ==========================================
  // SERVICES
  // ==========================================

  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});

  // ==========================================
  // PAYMENT
  // ==========================================

  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");

  // ==========================================
  // TECHNICIANS
  // ==========================================

  const [technicians, setTechnicians] = useState([]);
  const [serviceList, setServiceList] = useState([]);

  // ==========================================
  // LOAD SERVICES
  // ==========================================

  async function loadServices() {
    console.log("URL:", supabase.supabaseUrl);

    const { data, error, status } = await supabase
      .from("services")
      .select("*");

    console.log("STATUS:", status);
    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      console.error("SERVICE LOAD ERROR:", error);
      return;
    }

    setServiceList(data || []);
  }

  // ==========================================
  // LOAD TECHNICIANS
  // ==========================================

  async function loadTechnicians() {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);

    if (error) {
      console.log("TECHNICIAN ERROR:", error);
      return;
    }

    setTechnicians(data || []);
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadTechnicians();
    loadServices();
  }, []);

  // ==========================================
  // CALCULATE TOTAL
  // ==========================================

  const total = services.reduce((sum, serviceName) => {
    const details = serviceDetails[serviceName] || {};

    const price = Number(details.price || 0);
    const serviceDiscount = Number(details.discount || 0);
    const quantity = Number(details.quantity || 1);

    return (
      sum +
      Math.max(price * quantity - serviceDiscount, 0)
    );
  }, 0);

  // ==========================================
  // FINAL AMOUNT
  // ==========================================

  const finalAmount = Math.max(
    total - Number(discount || 0),
    0
  );

  const balance = Math.max(
    finalAmount - Number(deposit || 0),
    0
  );

  // ==========================================
  // CHOOSE SERVICE
  // ==========================================

  function chooseService(service, price) {
    console.log("CHOOSING SERVICE:", service, price);

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
        service
      ]);

      setServiceDetails((prev) => ({
        ...prev,

        [service]: {
          price: Number(price || 0),
          discount: 0,
          quantity: 1,
          technicians: []
        }
      }));
    }
  }

  // ==========================================
  // TEYSEER FULL WTT PRICING
  // ==========================================

  useEffect(() => {
    const isTeyseer =
      source === "Teyseer Motors" ||
      source === "Teyseer Motors - Bahaa" ||
      source === "Teyseer Motors - Salah";

    if (
      !isTeyseer ||
      !services.includes("Full WTT")
    ) {
      return;
    }

    let price = null;

    if (carType === "GWM") {
      price = 1000;
    } else if (carType === "Suzuki") {
      price = 800;
    }

    if (price === null) {
      return;
    }

    setServiceDetails((prev) => ({
      ...prev,

      "Full WTT": {
        ...prev["Full WTT"],
        price: price
      }
    }));
  }, [source, carType, services]);

  // ==========================================
  // SAVE JOB
  // ==========================================

  async function saveJob() {
    console.log("SAVE CLICKED");

    // -----------------------------------------
    // VALIDATE PAYMENT METHOD
    // -----------------------------------------

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    // -----------------------------------------
    // GET NEXT RECEIPT NUMBER
    // -----------------------------------------

    const {
      data: lastJob,
      error: receiptError
    } = await supabase
      .from("jobs")
      .select("receipt_number")
      .not("receipt_number", "is", null)
      .order("receipt_number", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (receiptError) {
      console.log(
        "RECEIPT NUMBER ERROR:",
        receiptError
      );

      alert(receiptError.message);
      return;
    }

    // -----------------------------------------
    // NEXT RECEIPT NUMBER
    // -----------------------------------------

    const nextReceiptNumber =
      lastJob?.receipt_number
        ? Number(lastJob.receipt_number) + 1
        : 2718;

    console.log(
      "NEXT RECEIPT NUMBER:",
      nextReceiptNumber
    );

    // -----------------------------------------
    // FINAL SOURCE
    // -----------------------------------------

    const finalSource =
      source === "Other"
        ? otherSource
        : source;

    // -----------------------------------------
    // CREATE JOB
    // -----------------------------------------

    const job = {
      customer,

      phone,

      date,

      receipt_number:
        nextReceiptNumber,

      source:
        finalSource,

      voucherNumber,

      carModel,

      carType,

      color,

      chassis,

      plate,

      services,

      serviceDetails,

      // IMPORTANT:
      // Database column is payment_method
      payment_method:
        paymentMethod,

      price:
        Number(total),

      discount:
        Number(discount),

      deposit:
        Number(deposit),

      balance:
        Number(balance),

      status:
        "New"
    };

    console.log(
      "JOB TO SAVE:",
      job
    );

    // -----------------------------------------
    // INSERT JOB
    // -----------------------------------------

    const {
      data: jobData,
      error: jobError
    } = await supabase
      .from("jobs")
      .insert([job])
      .select()
      .single();

    if (jobError) {
      console.log(
        "JOB ERROR:",
        jobError
      );

      alert(jobError.message);
      return;
    }

    console.log(
      "JOB CREATED:",
      jobData
    );

    // -----------------------------------------
    // CREATE PAYMENT
    // -----------------------------------------

    if (Number(deposit) > 0) {
      const {
        error: paymentError
      } = await supabase
        .from("payments")
        .insert([
          {
            job_id:
              jobData.id,

            amount:
              Number(deposit),

            payment_method:
              paymentMethod,

            payment_source:
              finalSource,

            payment_date:
              new Date(),

            notes:
              "Initial deposit"
          }
        ]);

      if (paymentError) {
        console.log(
          "PAYMENT ERROR:",
          paymentError
        );
      }
    }

    // -----------------------------------------
    // CREATE JOB SERVICES
    // -----------------------------------------

    for (
      const serviceName of services
    ) {
      const details =
        serviceDetails[serviceName] || {};

      const isTeyseer =
        finalSource ===
          "Teyseer Motors" ||
        finalSource ===
          "Teyseer Motors - Bahaa" ||
        finalSource ===
          "Teyseer Motors - Salah";

      let owner =
        "Sales Team";

      if (
        isTeyseer &&
        serviceName
          .toLowerCase()
          .includes("wtt")
      ) {
        owner =
          "Teyseer";
      }

      // ---------------------------------------
      // INSERT JOB SERVICE
      // ---------------------------------------

      const {
        data: serviceRow,
        error: serviceError
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

            owner:
              owner
          }
        ])
        .select()
        .single();

      console.log(
        "INSERT JOB SERVICE",
        serviceRow,
        serviceError
      );

      if (serviceError) {
        continue;
      }

      // ---------------------------------------
      // TECHNICIANS
      // ---------------------------------------

      const techRows =
        (
          details.technicians ||
          []
        ).map((technician) => ({
          service_id:
            serviceRow.id,

          technician_id:
            technician.id,

          commission:
            Number(
              technician.commission ||
              0
            )
        }));

      if (techRows.length) {
        const {
          error: techError
        } = await supabase
          .from("service_technicians")
          .insert(
            techRows
          );

        console.log(
          "TECH INSERT",
          techError
        );
      }
    }

    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------

    alert(
      `Job Saved Successfully!

Receipt Number: ${nextReceiptNumber}

Payment Method: ${paymentMethod}`
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div style={styles.page}>

      <h1>
        New Job
      </h1>

      <div style={styles.form}>

        {/* ====================================
            CUSTOMER
        ==================================== */}

        <h2>
          Customer Information
        </h2>

        <input
          placeholder="Customer Name"
          value={customer}
          onChange={(e) =>
            setCustomer(
              e.target.value
            )
          }
        />

        <input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
            )
          }
        />

        <label>
          Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(
              e.target.value
            )
          }
        />

        {/* ====================================
            SOURCE
        ==================================== */}

        <h2>
          Source
        </h2>

        <select
          value={source}
          onChange={(e) =>
            setSource(
              e.target.value
            )
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

        {(
          source ===
            "Teyseer Motors" ||
          source ===
            "Teyseer Motors - Bahaa" ||
          source ===
            "Teyseer Motors - Salah"
        ) && (
          <input
            placeholder="Voucher Number"
            value={voucherNumber}
            onChange={(e) =>
              setVoucherNumber(
                e.target.value
              )
            }
          />
        )}

        {/* ====================================
            VEHICLE
        ==================================== */}

        <h2>
          Vehicle Information
        </h2>

        <input
          placeholder="Car Model"
          value={carModel}
          onChange={(e) =>
            setCarModel(
              e.target.value
            )
          }
        />

        <label>
          Car Type
        </label>

        <select
          value={carType}
          onChange={(e) =>
            setCarType(
              e.target.value
            )
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
            setColor(
              e.target.value
            )
          }
        />

        <input
          placeholder="Chassis Number"
          value={chassis}
          onChange={(e) =>
            setChassis(
              e.target.value
            )
          }
        />

        <input
          placeholder="Plate Number"
          value={plate}
          onChange={(e) =>
            setPlate(
              e.target.value
            )
          }
        />

        {/* ====================================
            SERVICES
        ==================================== */}

        <h2>
          Services
        </h2>

        {serviceList.map(
          (serviceItem) => {
            const service =
              serviceItem.name;

            return (
              <div
                key={
                  serviceItem.id
                }
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
                                  e.target
                                    .value
                                )
                            }
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
                                  e.target
                                    .value
                                )
                            }
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
                                  e.target
                                    .value
                                ) || 1
                            }
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
                          ]
                            ?.technicians
                            ?.find(
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
                                    ]
                                      ?.technicians ||
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

                                          commission: 0
                                        }
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
                                          updated
                                      }
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
                                          (
                                            technician
                                          ) => {
                                            if (
                                              technician.id ===
                                              person.id
                                            ) {
                                              return {
                                                ...technician,

                                                commission:
                                                  Number(
                                                    e
                                                      .target
                                                      .value
                                                  )
                                              };
                                            }

                                            return technician;
                                          }
                                        );

                                      return {
                                        ...prev,

                                        [service]: {
                                          ...(prev[
                                            service
                                          ] || {}),

                                          technicians:
                                            updated
                                        }
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

        {/* ====================================
            PAYMENT
        ==================================== */}

        <h2>
          Payment
        </h2>

        <label>
          Payment Method
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
              Number(
                e.target.value
              )
            )
          }
        />

        <label>
          Deposit Paid
        </label>

        <input
          type="number"
          placeholder="Enter deposit"
          value={deposit}
          onChange={(e) =>
            setDeposit(
              Number(
                e.target.value
              )
            )
          }
        />

        {/* ====================================
            TOTALS
        ==================================== */}

        <div style={styles.summary}>

          <h3>
            Total:
            {" "}
            QAR {total.toFixed(2)}
          </h3>

          <h3>
            Discount:
            {" "}
            QAR {Number(
              discount || 0
            ).toFixed(2)}
          </h3>

          <h3>
            Net Amount:
            {" "}
            QAR {finalAmount.toFixed(2)}
          </h3>

          <h3>
            Deposit:
            {" "}
            QAR {Number(
              deposit || 0
            ).toFixed(2)}
          </h3>

          <h3>
            Balance Due:
            {" "}
            QAR {balance.toFixed(2)}
          </h3>

        </div>

        {/* ====================================
            SAVE
        ==================================== */}

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

// ==========================================
// STYLES
// ==========================================

const styles = {
  page: {
    padding: "30px",
    background: "var(--bg)",
    minHeight: "100vh"
  },

  form: {
    background: "#fff",
    padding: "25px",
    borderRadius: "12px",
    maxWidth: "650px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },

  serviceBox: {
    border: "1px solid #ddd",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "10px"
  },

  summary: {
    background: "#f8fafc",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0"
  },

  button: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "700"
  }
};

export default NewJob;