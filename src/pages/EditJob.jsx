import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useParams, useNavigate } from "react-router-dom";

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // JOB
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  // SERVICES
  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [serviceList, setServiceList] = useState([]);

  // SOURCE
  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");

  // PAYMENT
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Visa");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    loadJob();
    loadServices();
  }, [id]);

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*");

    if (error) {
      console.error("LOAD SERVICES ERROR:", error);
      return;
    }

    setServiceList(data || []);
  }

  async function loadJob() {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("LOAD JOB ERROR:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    console.log("EDIT JOB:", data);

    setCustomer(data.customer || "");
    setPhone(data.phone || "");
    setCarModel(data.carModel || "");
    setCarType(data.carType || "");
    setColor(data.color || "");
    setPlate(data.plate || "");

    // SOURCE
    const existingSource = String(data.source || "").trim();

    const standardSources = [
      "Teyseer Motors",
      "Teyseer Motors - Bahaa",
      "Teyseer Motors - Salah",
      "Bahaa",
      "Salah",
      "Walk-in"
    ];

    const matchedSource = standardSources.find(
      (item) =>
        item.toLowerCase() === existingSource.toLowerCase()
    );

    if (matchedSource) {
      setSource(matchedSource);
      setOtherSource("");
    } else if (existingSource) {
      setSource("Other");
      setOtherSource(existingSource);
    } else {
      setSource("");
      setOtherSource("");
    }

    // SERVICES
    const existingServices = Array.isArray(data.services)
      ? data.services
      : [];

    setServices(existingServices);

    if (
      data.serviceDetails &&
      typeof data.serviceDetails === "object"
    ) {
      setServiceDetails(data.serviceDetails);
    } else {
      setServiceDetails({});
    }

    setLoading(false);
  }

  function toggleService(serviceItem) {
    const serviceName = serviceItem.name;

    if (services.includes(serviceName)) {
      setServices((prev) =>
        prev.filter((service) => service !== serviceName)
      );

      setServiceDetails((prev) => {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      });
    } else {
      setServices((prev) => [
        ...prev,
        serviceName
      ]);

      setServiceDetails((prev) => ({
        ...prev,
        [serviceName]: {
          price: Number(serviceItem.price || 0),
          discount: 0
        }
      }));
    }
  }

  function updateServicePrice(serviceName, price) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        price: Number(price || 0)
      }
    }));
  }

  function updateServiceDiscount(serviceName, discount) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        discount: Number(discount || 0)
      }
    }));
  }

  async function save() {
    if (saving) return;

    setSaving(true);

    try {
      // -----------------------------------
      // CALCULATE TOTAL
      // -----------------------------------

      const total = services.reduce(
        (sum, serviceName) => {
          const details =
            serviceDetails[serviceName] || {};

          const price = Number(details.price || 0);
          const discount = Number(details.discount || 0);

          return (
            sum +
            Math.max(price - discount, 0)
          );
        },
        0
      );

      const finalSource =
        source === "Other"
          ? otherSource.trim()
          : source;

      // -----------------------------------
      // 1. UPDATE JOB
      // -----------------------------------

      console.log("SAVING JOB:", {
        id,
        customer,
        phone,
        total
      });

      const {
        data: updatedJob,
        error: jobError
      } = await supabase
        .from("jobs")
        .update({
          customer,
          phone,
          source: finalSource,
          carModel,
          carType,
          color,
          plate,
          services,
          serviceDetails,
          price: total
        })
        .eq("id", id)
        .select()
        .single();

      console.log("UPDATED JOB:", updatedJob);
      console.log("JOB ERROR:", jobError);

      if (jobError) {
        throw new Error(
          "Job could not be saved: " +
          jobError.message
        );
      }

      // -----------------------------------
      // 2. SAVE PAYMENT
      // -----------------------------------

      const amount = Number(paymentAmount || 0);

      if (amount > 0) {
        console.log("========== PAYMENT DEBUG ==========");
console.log("URL JOB ID:", id);
console.log("NUMBER JOB ID:", Number(id));
console.log("PAYMENT AMOUNT:", amount);
console.log("PAYMENT METHOD:", paymentMethod);
console.log("PAYMENT DATE:", paymentDate);
console.log("PAYMENT NOTES:", paymentNotes);
console.log("==================================");
        console.log("SAVING PAYMENT:", {
          job_id: Number(id),
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: paymentNotes
        });

        const {
          data: payment,
          error: paymentError
        } = await supabase
          .from("payments")
          .insert({
            job_id: Number(id),
            amount: amount,
            payment_method: paymentMethod,
            payment_date: paymentDate,
            notes: paymentNotes.trim() || null
          })
          .select()
          .single();

        console.log("NEW PAYMENT:", payment);
        console.log("PAYMENT ERROR:", paymentError);

        if (paymentError) {
          throw new Error(
            "Job was saved, but payment failed: " +
            paymentError.message
          );
        }
      }

      // -----------------------------------
      // SUCCESS
      // -----------------------------------

      alert(
        amount > 0
          ? "Job and payment saved successfully!"
          : "Job updated successfully!"
      );

      navigate(`/jobs/${id}`);

    } catch (error) {
      console.error("SAVE ERROR:", error);

      alert(error.message || "Something went wrong.");

    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.page}>

      <h2>Edit Job #{id}</h2>

      {/* CUSTOMER */}

      <input
        value={customer}
        onChange={(e) =>
          setCustomer(e.target.value)
        }
        placeholder="Customer"
        style={styles.input}
      />

      <input
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value)
        }
        placeholder="Phone"
        style={styles.input}
      />

      <input
        value={carModel}
        onChange={(e) =>
          setCarModel(e.target.value)
        }
        placeholder="Model"
        style={styles.input}
      />

      <input
        value={carType}
        onChange={(e) =>
          setCarType(e.target.value)
        }
        placeholder="Type"
        style={styles.input}
      />

      <input
        value={color}
        onChange={(e) =>
          setColor(e.target.value)
        }
        placeholder="Color"
        style={styles.input}
      />

      <input
        value={plate}
        onChange={(e) =>
          setPlate(e.target.value)
        }
        placeholder="Plate"
        style={styles.input}
      />

      {/* SOURCE */}

      <label style={{ fontWeight: "bold" }}>
        Source
      </label>

      <select
        value={source}
        onChange={(e) =>
          setSource(e.target.value)
        }
        style={styles.sourceSelect}
      >
        <option value="">Select Source</option>

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
          value={otherSource}
          onChange={(e) =>
            setOtherSource(e.target.value)
          }
          placeholder="Enter source"
          style={styles.input}
        />
      )}

      {/* SERVICES */}

      <h3>Services</h3>

      {serviceList.map((item) => {
        const selected =
          services.includes(item.name);

        const details =
          serviceDetails[item.name] || {
            price: item.price || 0,
            discount: 0
          };

        return (
          <div
            key={item.id}
            style={styles.serviceBox}
          >
            <label>
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  toggleService(item)
                }
              />

              {" "}

              {item.name}
            </label>

            {selected && (
              <div style={styles.serviceDetails}>

                <label>
                  Price
                </label>

                <input
                  type="number"
                  value={details.price || 0}
                  onChange={(e) =>
                    updateServicePrice(
                      item.name,
                      e.target.value
                    )
                  }
                  style={styles.input}
                />

                <label>
                  Discount
                </label>

                <input
                  type="number"
                  value={details.discount || 0}
                  onChange={(e) =>
                    updateServiceDiscount(
                      item.name,
                      e.target.value
                    )
                  }
                  style={styles.input}
                />

                <div>
                  Final: QAR{" "}
                  {Math.max(
                    Number(details.price || 0) -
                      Number(details.discount || 0),
                    0
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })}

      {/* TOTAL */}

      <div style={styles.total}>
        Total: QAR{" "}
        {services.reduce(
          (sum, serviceName) => {
            const details =
              serviceDetails[serviceName] || {};

            return (
              sum +
              Math.max(
                Number(details.price || 0) -
                  Number(details.discount || 0),
                0
              )
            );
          },
          0
        )}
      </div>

      {/* PAYMENT */}

      <div style={styles.paymentBox}>

        <h3>Make Payment</h3>

        <label>
          Payment Amount
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={paymentAmount}
          onChange={(e) =>
            setPaymentAmount(e.target.value)
          }
          placeholder="Enter payment amount"
          style={styles.input}
        />

        <label>
          Payment Method
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
          style={styles.sourceSelect}
        >
          <option value="Visa">
            Visa
          </option>

          <option value="Mastercard">
            Mastercard
          </option>

          <option value="PayLater">
            PayLater
          </option>

          <option value="Cash">
            Cash
          </option>

          <option value="Bank Transfer">
            Bank Transfer
          </option>
        </select>

        <label>
          Payment Date
        </label>

        <input
          type="date"
          value={paymentDate}
          onChange={(e) =>
            setPaymentDate(e.target.value)
          }
          style={styles.input}
        />

        <label>
          Notes
        </label>

        <input
          value={paymentNotes}
          onChange={(e) =>
            setPaymentNotes(e.target.value)
          }
          placeholder="Payment notes"
          style={styles.input}
        />

      </div>

      {/* SAVE */}

      <button
        onClick={save}
        disabled={saving}
        style={{
          ...styles.saveButton,
          opacity: saving ? 0.6 : 1
        }}
      >
        {saving
          ? "SAVING..."
          : "SAVE CHANGES"}
      </button>

    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "600px"
  },

  serviceBox: {
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "10px"
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "10px",
    paddingLeft: "25px"
  },

  paymentBox: {
    marginTop: "20px",
    padding: "20px",
    border: "2px solid #2563eb",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  total: {
    fontSize: "20px",
    fontWeight: "bold",
    marginTop: "10px"
  },

  saveButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  sourceSelect: {
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "white",
    color: "#111",
    fontSize: "15px",
    cursor: "pointer"
  },

  input: {
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "15px"
  }
};

export default EditJob;