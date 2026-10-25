import DigestFetch from "digest-fetch";

const client = new DigestFetch(
  process.env.HIKVISION_USERNAME,
  process.env.HIKVISION_PASSWORD
);

const DEVICE_URL = `http://${process.env.HIKVISION_IP}`;

async function activateHikvisionAccess(employeeNo, expiryDate) {
  const formatDate = (date) => {
    const d = new Date(date);

    // Hikvision's device-local date format
    return (
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d.getDate()).padStart(2, "0")}T` +
      `${String(d.getHours()).padStart(2, "0")}:` +
      `${String(d.getMinutes()).padStart(2, "0")}:` +
      `${String(d.getSeconds()).padStart(2, "0")}`
    );
  };

  const payload = {
    UserInfo: {
      employeeNo: String(employeeNo),
      userType: "normal",
      Valid: {
        enable: true,
        beginTime: formatDate(new Date()),
        endTime: formatDate(expiryDate)
      },
      RightPlan: [
        {
          doorNo: Number(process.env.HIKVISION_DOOR_NO || 1),
          planTemplateNo: String(
            process.env.HIKVISION_PLAN_TEMPLATE_NO || "1"
          )
        }
      ]
    }
  };

  const response = await client.fetch(
    `${DEVICE_URL}/ISAPI/AccessControl/UserInfo/SetUp?format=json`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Hikvision returned HTTP ${response.status}: ${responseText}`
    );
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = responseText;
  }

  // Hikvision may report an operation-level error in its response.
  if (
    result &&
    typeof result === "object" &&
    result.statusCode !== undefined &&
    Number(result.statusCode) !== 1
  ) {
    throw new Error(
      `Hikvision rejected the operation: ${responseText}`
    );
  }

  return {
    success: true,
    employeeNo: String(employeeNo),
    response: result
  };
}

export default activateHikvisionAccess;