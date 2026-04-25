const {
  startAlertWorkflow,
  stopAlertWorkflow,
  acknowledgeAlert,
  getAlertDetails,
  getUserAlerts
} = require("../services/alertService");

async function startAlert(req, res, next) {
  try {
    const result = await startAlertWorkflow(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function stopAlert(req, res, next) {
  try {
    const result = await stopAlertWorkflow(req.params.alertId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function acknowledgeAlertController(req, res, next) {
  try {
    const result = await acknowledgeAlert(req.params.alertId, req.body.recipientEmail);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getAlert(req, res, next) {
  try {
    const result = await getAlertDetails(req.params.alertId);

    if (!result) {
      return res.status(404).json({ message: "Alert not found." });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getAlertsByUser(req, res, next) {
  try {
    const result = await getUserAlerts(req.params.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startAlert,
  stopAlert,
  acknowledgeAlertController,
  getAlert,
  getAlertsByUser
};
