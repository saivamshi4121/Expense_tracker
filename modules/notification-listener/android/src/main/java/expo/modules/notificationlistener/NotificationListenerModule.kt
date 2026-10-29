package expo.modules.notificationlistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("NotificationListener")

        Events("onNotification")

        Function("isPermissionGranted") {
            val context = appContext.reactContext ?: return@Function false
            PaymentNotificationListener.isPermissionEnabled(context)
        }

        Function("openPermissionSettings") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("sendTestNotification") {
            val context = appContext.reactContext ?: return@Function null
            sendTestPaymentNotification(context)

            val map = mapOf(
                "packageName" to "com.google.android.apps.nbu.paisa.user",
                "postTime" to System.currentTimeMillis(),
                "notificationId" to 9999,
                "title" to "Google Pay",
                "text" to "\u20B9850 paid to Swiggy using UPI. Transaction successful. UPI Ref No: TEST123456. A/c XX1234 debited on 06-09-26."
            )
            sendEvent("onNotification", map)
        }

        OnCreate {
            PaymentNotificationListener.setModule(this@NotificationListenerModule)
        }
    }

    private fun sendTestPaymentNotification(context: android.content.Context) {
        val channelId = "test_payment_channel"
        val nm = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Test Payments", NotificationManager.IMPORTANCE_DEFAULT)
            nm.createNotificationChannel(channel)
        }

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, channelId)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
        }
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Google Pay")
            .setContentText("₹850 paid to Swiggy using UPI. Transaction successful. Ref: TEST123456")
            .setStyle(
                Notification.BigTextStyle()
                    .bigText("₹850 paid to Swiggy using UPI. Transaction successful. UPI Ref No: TEST123456. A/c XX1234 debited on 06-09-26.")
            )
            .setWhen(System.currentTimeMillis())
            .setAutoCancel(true)
            .build()

        nm.notify(9999, notification)
    }

    fun sendNotificationEvent(bundle: Bundle) {
        val map = mapOf(
            "packageName" to (bundle.getString("packageName") ?: ""),
            "postTime" to bundle.getLong("postTime"),
            "notificationId" to bundle.getInt("notificationId"),
            "title" to (bundle.getString("title") ?: ""),
            "text" to (bundle.getString("text") ?: "")
        )
        sendEvent("onNotification", map)
    }
}
