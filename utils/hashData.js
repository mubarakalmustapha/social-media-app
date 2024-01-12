const bcrypt = require("bcrypt");

async function hashData(data, salt = 10) {
  try {
    return (hasheData = await bcrypt.hash(data, salt));
  } catch (error) {
    throw error;
  }
}

module.exports = hashData;
