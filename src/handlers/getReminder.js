const { logger, arrayIntersection, generateMessageForReminders } = require('../utils')
const i18nFactory = require('../factories/i18nFactory')
const { extractSlots, flowContinueBuiltin } = require('./common')
const {
    getReminders
} = require('../reminders')

// Sub-handler, report all the found reminders
function reportReminders(flow, slots, reminders) {
    flow.end()
    return generateMessageForReminders(reminders, slots.past_reminders ? true : false)
}

// Sub-handler, ask to create reminder
function askToCreateReminder(flow, slots, depth) {
    slots.depth = depth
    flowContinueBuiltin(flow, slots, require('./index').getReminder)
    const i18n = i18nFactory.get()
    flow.continue('snips-assistant:Yes', (msg, flow) => {
        slots.depth = 3
        return require('./index').setReminder(msg, flow, slots)
    })
    flow.continue('snips-assistant:No', (msg, flow) => {
        flow.end()
    })
    return i18n('getReminders.info.noReminderFound') + i18n('setReminder.ask.createReminder')
}

module.exports = async function(msg, flow, knownSlots = { depth: 2 }) {
    logger.debug(`getReminder, depth: ${knownSlots.depth}`)
    const i18n = i18nFactory.get()
    const slots = await extractSlots(msg, knownSlots)
    const reminders = getReminders(
        slots.reminder_name,
        slots.datetime,
        slots.recurrence,
        slots.past_reminders ? true : false
    )

    // No reminders, no slots
    if (!reminders.length && !Object.keys(slots).length) {
        logger.debug('No reminders, no slots')
        flow.end()
        return i18n('getReminders.info.noReminderFound')
    }

    // No reminders, slots detected
    if (!reminders.length && Object.keys(slots).length) {
        logger.debug('No reminders, slots detected')
        return askToCreateReminder(flow, slots, --knownSlots.depth)
    }

    // Found reminders by using some of the constrains
    if (reminders.length) {
        logger.debug('Found reminders by using some of the constrains')
        return reportReminders(flow, slots, reminders)
    }

    flow.end()
    return i18n('debug.caseNotRecognized')
}