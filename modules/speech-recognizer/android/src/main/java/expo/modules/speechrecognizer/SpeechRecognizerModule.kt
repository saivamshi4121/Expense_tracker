package expo.modules.speechrecognizer

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SpeechRecognizerModule : Module() {

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false

    override fun definition() = ModuleDefinition {
        Name("SpeechRecognizer")

        Events(
            "onSpeechResult",
            "onSpeechError",
            "onSpeechStart",
            "onSpeechEnd"
        )

        OnCreate {
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[VOICE] Module created")
            }
        }

        Function("isAvailable") {
            val ctx = appContext.reactContext
            val available = ctx?.let { SpeechRecognizer.isRecognitionAvailable(it) } ?: false
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[VOICE] isAvailable() result=$available")
            }
            available
        }

        Function("hasPermission") {
            val ctx = appContext.reactContext
            val granted = ctx?.let {
                ContextCompat.checkSelfPermission(it, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            } ?: false
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[VOICE] hasPermission() result=$granted")
            }
            granted
        }

        Function("requestPermission") {
            val activity = appContext.currentActivity ?: run {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] requestPermission: no current activity")
                }
                return@Function false
            }
            val ctx = appContext.reactContext ?: run {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] requestPermission: no react context")
                }
                return@Function false
            }

            if (hasAudioPermission(ctx)) {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "[VOICE] requestPermission: already granted")
                }
                return@Function true
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "[VOICE] requestPermission: requesting RECORD_AUDIO")
                }
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.RECORD_AUDIO),
                    PERMISSION_REQUEST_CODE
                )
                return@Function false
            }

            false
        }

        Function("startListening") {
            val activity = appContext.currentActivity ?: run {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] startListening: no current activity")
                }
                return@Function null
            }

            if (isListening) {
                if (BuildConfig.DEBUG) {
                    Log.w(TAG, "[VOICE] startListening: already_listening")
                }
                return@Function "already_listening"
            }

            if (!hasAudioPermission(activity)) {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] startListening: no_permission")
                }
                return@Function "no_permission"
            }

            if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] startListening: not_available")
                }
                return@Function "not_available"
            }

            try {
                activity.runOnUiThread {
                    try {
                        destroyRecognizer()
                        if (BuildConfig.DEBUG) {
                            Log.d(TAG, "[VOICE] Creating SpeechRecognizer with ACTIVITY context...")
                        }
                        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(activity)
                        speechRecognizer?.setRecognitionListener(createRecognitionListener())

                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                        }

                        if (BuildConfig.DEBUG) {
                            Log.d(TAG, "[VOICE] Calling speechRecognizer.startListening(intent)...")
                        }
                        speechRecognizer?.startListening(intent)
                        isListening = true
                    } catch (e: Exception) {
                        isListening = false
                        if (BuildConfig.DEBUG) {
                            Log.e(TAG, "[VOICE-ERROR] Error in runOnUiThread", e)
                        }
                        sendEvent("onSpeechError", mapOf("code" to -1, "message" to "Failed to start: ${e.message}"))
                    }
                }
                "started"
            } catch (e: Exception) {
                if (BuildConfig.DEBUG) {
                    Log.e(TAG, "[VOICE-ERROR] Error posting to UI thread", e)
                }
                "error"
            }
        }

        Function("stopListening") {
            val activity = appContext.currentActivity ?: return@Function false
            if (!isListening) return@Function false

            activity.runOnUiThread {
                try {
                    speechRecognizer?.stopListening()
                    isListening = false
                } catch (e: Exception) {
                    if (BuildConfig.DEBUG) {
                        Log.e(TAG, "[VOICE-ERROR] Error stopping", e)
                    }
                    isListening = false
                }
            }
            true
        }

        Function("cancel") {
            val activity = appContext.currentActivity ?: return@Function false
            activity.runOnUiThread {
                destroyRecognizer()
            }
            true
        }

        OnDestroy {
            val activity = appContext.currentActivity ?: return@OnDestroy
            activity.runOnUiThread {
                destroyRecognizer()
            }
        }
    }

    private fun destroyRecognizer() {
        try {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            if (BuildConfig.DEBUG) {
                Log.e(TAG, "[VOICE-ERROR] destroyRecognizer", e)
            }
        } finally {
            speechRecognizer = null
            isListening = false
        }
    }

    private fun hasAudioPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }

    private fun createRecognitionListener() = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[VOICE] onReadyForSpeech")
            }
            sendEvent("onSpeechStart", emptyMap())
        }

        override fun onBeginningOfSpeech() {
        }

        override fun onRmsChanged(rmsdB: Float) {}

        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {
            isListening = false
            sendEvent("onSpeechEnd", emptyMap())
        }

        override fun onError(error: Int) {
            isListening = false
            val errorMessage = when (error) {
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                SpeechRecognizer.ERROR_CLIENT -> "Client error"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> "Network error"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                SpeechRecognizer.ERROR_SERVER -> "Server error"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                else -> "Unknown error ($error)"
            }
            if (BuildConfig.DEBUG) {
                Log.e(TAG, "[VOICE-ERROR] code=$error message=$errorMessage")
            }
            sendEvent("onSpeechError", mapOf("code" to error, "message" to errorMessage))
            destroyRecognizer()
        }

        override fun onResults(results: Bundle?) {
            isListening = false
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val primaryText = matches?.firstOrNull() ?: ""
            if (BuildConfig.DEBUG) {
                Log.d(TAG, "[VOICE] Final results received")
            }
            sendEvent("onSpeechResult", mapOf(
                "text" to primaryText,
                "allMatches" to (matches ?: arrayListOf())
            ))
            destroyRecognizer()
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val primaryText = matches?.firstOrNull() ?: ""
            if (primaryText.isNotEmpty()) {
                sendEvent("onSpeechResult", mapOf(
                    "text" to primaryText,
                    "isPartial" to true
                ))
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {
        }
    }

    companion object {
        private const val TAG = "SpeechRecognizerModule"
        private const val PERMISSION_REQUEST_CODE = 7749
    }
}
