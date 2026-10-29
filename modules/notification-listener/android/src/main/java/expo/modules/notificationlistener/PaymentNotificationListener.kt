package expo.modules.notificationlistener

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Android NotificationListenerService that captures payment notifications.
 * Runs as a foreground service when the user grants notification access.
 * Sends raw notification data to the React Native bridge via events.
 */
class PaymentNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNLS"
        private var moduleInstance: NotificationListenerModule? = null

        fun setModule(module: NotificationListenerModule?) {
            moduleInstance = module
        }

        fun isPermissionEnabled(context: Context): Boolean {
            val packageName = context.packageName
            val flat = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false

            if (flat.isEmpty()) return false

            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && cn.packageName == packageName) {
                    return true
                }
            }
            return flat.contains(packageName)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        try {
            val notification = sbn.notification ?: return
            val extras = notification.extras ?: return

            // Extract notification data
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()

            // Use bigText if available (full notification content), otherwise use text
            val displayText = if (!bigText.isNullOrBlank()) bigText else text

            // Skip empty notifications
            if (title.isBlank() && displayText.isBlank()) return

            // Build bundle to send to React Native
            val bundle = Bundle().apply {
                putString("packageName", sbn.packageName)
                putLong("postTime", sbn.postTime)
                putInt("notificationId", sbn.id)
                putString("title", title)
                putString("text", displayText)
            }

            // Send to React Native via the module's event emitter
            moduleInstance?.sendNotificationEvent(bundle)
        } catch (e: Exception) {
            Log.e(TAG, "onNotificationPosted error", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // No-op
    }
}
