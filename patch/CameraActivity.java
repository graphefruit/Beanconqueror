package com.capgo.camera.preview;

import android.app.Activity;
import android.app.Fragment;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Bitmap.CompressFormat;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.hardware.Camera;
import android.hardware.Camera.PictureCallback;
import android.hardware.Camera.ShutterCallback;
import android.media.AudioManager;
import android.media.CamcorderProfile;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;
import android.widget.RelativeLayout;
import androidx.exifinterface.media.ExifInterface;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public class CameraActivity extends Fragment {

    public interface CameraPreviewListener {
        void onPictureTaken(String originalPicture);
        void onPictureTakenError(String message);
        void onSnapshotTaken(String originalPicture);
        void onSnapshotTakenError(String message);
        void onFocusSet(int pointX, int pointY);
        void onFocusSetError(String message);
        void onBackButton();
        void onCameraStarted();
        void onStartRecordVideo();
        void onStartRecordVideoError(String message);
        void onStopRecordVideo(String file);
        void onStopRecordVideoError(String error);
    }

    private CameraPreviewListener eventListener;
    private static final String TAG = "CameraActivity";
    public FrameLayout mainLayout;
    public FrameLayout frameContainerLayout;

    private Preview mPreview;
    private boolean canTakePicture = true;

    private View view;
    private Camera.Parameters cameraParameters;
    private Camera mCamera;
    private int numberOfCameras;
    private int cameraCurrentlyLocked;
    private int currentQuality;

    private enum RecordingState {
        INITIALIZING,
        STARTED,
        STOPPED
    }

    private RecordingState mRecordingState = RecordingState.INITIALIZING;
    private MediaRecorder mRecorder = null;
    private String recordFilePath;
    private float opacity;

    // The first rear facing camera
    private int defaultCameraId;
    public String defaultCamera;
    public boolean tapToTakePicture;
    public boolean dragEnabled;
    public boolean tapToFocus;
    public boolean disableExifHeaderStripping;
    public boolean storeToFile;
    public boolean toBack;
    public boolean enableOpacity = false;
    public boolean enableZoom = false;

    public int width;
    public int height;
    public int x;
    public int y;

    public void setEventListener(CameraPreviewListener listener) {
        eventListener = listener;
    }

    private String appResourcesPackage;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        appResourcesPackage = getActivity().getPackageName();

        // Inflate the layout for this fragment
        view = inflater.inflate(getResources().getIdentifier("camera_activity", "layout", appResourcesPackage), container, false);
        createCameraPreview();
        return view;
    }

    public void setRect(int x, int y, Integer width, Integer height) {
        this.x = x;
        this.y = y;
        this.width = width == null ? ViewGroup.LayoutParams.MATCH_PARENT : width;
        this.height = height == null ? ViewGroup.LayoutParams.MATCH_PARENT : height;
    }

    private void createCameraPreview() {
        if (mPreview == null) {
            setDefaultCameraId();

            //set box position and size
            FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(width, height);
            layoutParams.setMargins(x, y, 0, 0);
            frameContainerLayout = (FrameLayout) view.findViewById(
                getResources().getIdentifier("frame_container", "id", appResourcesPackage)
            );
            frameContainerLayout.setLayoutParams(layoutParams);

            //video view
            mPreview = new Preview(getActivity(), enableOpacity);
            mainLayout = (FrameLayout) view.findViewById(getResources().getIdentifier("video_view", "id", appResourcesPackage));
            mainLayout.setLayoutParams(
                new RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.MATCH_PARENT, RelativeLayout.LayoutParams.MATCH_PARENT)
            );
            mainLayout.addView(mPreview);
            mainLayout.setEnabled(false);

            if (enableZoom) {
                this.setupTouchAndBackButton();
            }
        }
    }

    private void setupTouchAndBackButton() {
        final GestureDetector gestureDetector = new GestureDetector(getActivity().getApplicationContext(), new TapGestureDetector());

        getActivity().runOnUiThread(
                new Runnable() {
                    @Override
                    public void run() {
                        frameContainerLayout.setClickable(true);
                        frameContainerLayout.setOnTouchListener(
                            new View.OnTouchListener() {
                                private int mLastTouchX;
                                private int mLastTouchY;
                                private int mPosX = 0;
                                private int mPosY = 0;

                                @Override
                                public boolean onTouch(View v, MotionEvent event) {
                                    FrameLayout.LayoutParams layoutParams =
                                        (FrameLayout.LayoutParams) frameContainerLayout.getLayoutParams();

                                    boolean isSingleTapTouch = gestureDetector.onTouchEvent(event);
                                    int action = event.getAction();
                                    int eventCount = event.getPointerCount();
                                    Log.d(TAG, "onTouch event, action, count: " + event + ", " + action + ", " + eventCount);
                                    if (eventCount > 1) {
                                        // handle multi-touch events
                                        Camera.Parameters params = mCamera.getParameters();
                                        if (action == MotionEvent.ACTION_POINTER_DOWN) {
                                            mDist = getFingerSpacing(event);
                                        } else if (action == MotionEvent.ACTION_MOVE && params.isZoomSupported()) {
                                            handleZoom(event, params);
                                        }
                                    } else {
                                        if (action != MotionEvent.ACTION_MOVE && isSingleTapTouch) {
                                            if (tapToTakePicture && tapToFocus) {
                                                setFocusArea(
                                                    (int) event.getX(0),
                                                    (int) event.getY(0),
                                                    new Camera.AutoFocusCallback() {
                                                        public void onAutoFocus(boolean success, Camera camera) {
                                                            if (success) {
                                                                takePicture(0, 0, 85);
                                                            } else {
                                                                Log.d(TAG, "onTouch:" + " setFocusArea() did not suceed");
                                                            }
                                                        }
                                                    }
                                                );
                                            } else if (tapToTakePicture) {
                                                takePicture(0, 0, 85);
                                            } else if (tapToFocus) {
                                                setFocusArea(
                                                    (int) event.getX(0),
                                                    (int) event.getY(0),
                                                    new Camera.AutoFocusCallback() {
                                                        public void onAutoFocus(boolean success, Camera camera) {
                                                            if (success) {
                                                                // A callback to JS might make sense here.
                                                            } else {
                                                                Log.d(TAG, "onTouch:" + " setFocusArea() did not suceed");
                                                            }
                                                        }
                                                    }
                                                );
                                            }
                                            return true;
                                        } else {
                                            if (dragEnabled) {
                                                int x;
                                                int y;

                                                switch (event.getAction()) {
                                                    case MotionEvent.ACTION_DOWN:
                                                        if (mLastTouchX == 0 || mLastTouchY == 0) {
                                                            mLastTouchX = (int) event.getRawX() - layoutParams.leftMargin;
                                                            mLastTouchY = (int) event.getRawY() - layoutParams.topMargin;
                                                        } else {
                                                            mLastTouchX = (int) event.getRawX();
                                                            mLastTouchY = (int) event.getRawY();
                                                        }
                                                        break;
                                                    case MotionEvent.ACTION_MOVE:
                                                        x = (int) event.getRawX();
                                                        y = (int) event.getRawY();

                                                        final float dx = x - mLastTouchX;
                                                        final float dy = y - mLastTouchY;

                                                        mPosX += dx;
                                                        mPosY += dy;

                                                        layoutParams.leftMargin = mPosX;
                                                        layoutParams.topMargin = mPosY;

                                                        frameContainerLayout.setLayoutParams(layoutParams);

                                                        // Remember this touch position for the next move event
                                                        mLastTouchX = x;
                                                        mLastTouchY = y;

                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                        }
                                    }
                                    return true;
                                }
                            }
                        );
                        frameContainerLayout.setFocusableInTouchMode(true);
                        frameContainerLayout.requestFocus();
                        frameContainerLayout.setOnKeyListener(
                            new View.OnKeyListener() {
                                @Override
                                public boolean onKey(View v, int keyCode, android.view.KeyEvent event) {
                                    if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
                                        eventListener.onBackButton();
                                        return true;
                                    }
                                    return false;
                                }
                            }
                        );
                    }

                    private float mDist = 0F;

                    private void handleZoom(MotionEvent event, Camera.Parameters params) {
                        if (mCamera != null) {
                            mCamera.cancelAutoFocus();
                            int maxZoom = params.getMaxZoom();
                            int zoom = params.getZoom();
                            float newDist = getFingerSpacing(event);
                            if (newDist > mDist) {
                                //zoom in
                                if (zoom < maxZoom) zoom++;
                            } else if (newDist < mDist) {
                                //zoom out
                                if (zoom > 0) zoom--;
                            }
                            mDist = newDist;
                            params.setZoom(zoom);
                            mCamera.setParameters(params);
                        }
                    }
                }
            );
    }

    private void setDefaultCameraId() {
        // Find the total number of cameras available
        numberOfCameras = Camera.getNumberOfCameras();

        int facing = "front".equals(defaultCamera) ? Camera.CameraInfo.CAMERA_FACING_FRONT : Camera.CameraInfo.CAMERA_FACING_BACK;

        // Find the ID of the default camera
        Camera.CameraInfo cameraInfo = new Camera.CameraInfo();
        for (int i = 0; i < numberOfCameras; i++) {
            Camera.getCameraInfo(i, cameraInfo);
            if (cameraInfo.facing == facing) {
                defaultCameraId = i;
                break;
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        mCamera = Camera.open(defaultCameraId);

        if (cameraParameters != null) {
            mCamera.setParameters(cameraParameters);
        }

        cameraCurrentlyLocked = defaultCameraId;

        if (mPreview.mPreviewSize == null) {
            mPreview.setCamera(mCamera, cameraCurrentlyLocked);
            eventListener.onCameraStarted();
        } else {
            mPreview.switchCamera(mCamera, cameraCurrentlyLocked);
            mCamera.startPreview();
        }

        Log.d(TAG, "cameraCurrentlyLocked:" + cameraCurrentlyLocked);

        final FrameLayout frameContainerLayout = (FrameLayout) view.findViewById(
            getResources().getIdentifier("frame_container", "id", appResourcesPackage)
        );

        ViewTreeObserver viewTreeObserver = frameContainerLayout.getViewTreeObserver();

        if (viewTreeObserver.isAlive()) {
            viewTreeObserver.addOnGlobalLayoutListener(
                new ViewTreeObserver.OnGlobalLayoutListener() {
                    @Override
                    public void onGlobalLayout() {
                        frameContainerLayout.getViewTreeObserver().removeGlobalOnLayoutListener(this);
                        frameContainerLayout.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
                        Activity activity = getActivity();
                        if (isAdded() && activity != null) {
                            final RelativeLayout frameCamContainerLayout = (RelativeLayout) view.findViewById(
                                getResources().getIdentifier("frame_camera_cont", "id", appResourcesPackage)
                            );

                            FrameLayout.LayoutParams camViewLayout = new FrameLayout.LayoutParams(
                                frameContainerLayout.getWidth(),
                                frameContainerLayout.getHeight()
                            );
                            camViewLayout.gravity = Gravity.CENTER_HORIZONTAL | Gravity.CENTER_VERTICAL;
                            frameCamContainerLayout.setLayoutParams(camViewLayout);
                        }
                    }
                }
            );
        }
    }

    @Override
    public void onPause() {
        super.onPause();

        // Because the Camera object is a shared resource, it's very important to release it when the activity is paused.
        if (mCamera != null) {
            setDefaultCameraId();
            mPreview.setCamera(null, -1);
            mCamera.setPreviewCallback(null);
            mCamera.release();
            mCamera = null;
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        final FrameLayout frameContainerLayout = (FrameLayout) view.findViewById(
            getResources().getIdentifier("frame_container", "id", appResourcesPackage)
        );

        final int previousOrientation = frameContainerLayout.getHeight() > frameContainerLayout.getWidth()
            ? Configuration.ORIENTATION_PORTRAIT
            : Configuration.ORIENTATION_LANDSCAPE;
        // Checks if the orientation of the screen has changed
        if (newConfig.orientation != previousOrientation) {
            final RelativeLayout frameCamContainerLayout = (RelativeLayout) view.findViewById(
                getResources().getIdentifier("frame_camera_cont", "id", appResourcesPackage)
            );

            frameContainerLayout.getLayoutParams().width = frameCamContainerLayout.getHeight();
            frameContainerLayout.getLayoutParams().height = frameCamContainerLayout.getWidth();

            frameCamContainerLayout.getLayoutParams().width = frameCamContainerLayout.getHeight();
            frameCamContainerLayout.getLayoutParams().height = frameCamContainerLayout.getWidth();

            frameContainerLayout.invalidate();
            frameContainerLayout.requestLayout();

            frameCamContainerLayout.forceLayout();

            mPreview.setCameraDisplayOrientation();
        }
    }

    public Camera getCamera() {
        return mCamera;
    }

    /**
     * Method to get the front camera id if the current camera is back and visa versa
     *
     * @return front or back camera id depending on the currently active camera
     */
    private int getNextCameraId() {
        int nextCameraId = 0;

        // Find the total number of cameras available
        // NOTE: The getNumberOfCameras() method in Android's android.hardware.camera API returns the total
        // number of cameras available on the device. The number might not be limited to just the front
        // and back cameras because modern smartphones often come with more than two cameras.
        // For example, devices might have:
        // - a main (back) camera.
        // - a wide-angle camera.
        // - a telephoto camera.
        // - a depth-sensing camera.
        // - an ultrawide camera.
        // - a macro camera.
        // etc.
        numberOfCameras = Camera.getNumberOfCameras();

        int nextFacing = cameraCurrentlyLocked == Camera.CameraInfo.CAMERA_FACING_BACK
            ? Camera.CameraInfo.CAMERA_FACING_FRONT
            : Camera.CameraInfo.CAMERA_FACING_BACK;

        // Find the next ID of the camera to switch to (front if the current is back and visa versa)
        Camera.CameraInfo cameraInfo = new Camera.CameraInfo();
        for (int i = 0; i < numberOfCameras; i++) {
            Camera.getCameraInfo(i, cameraInfo);
            if (cameraInfo.facing == nextFacing) {
                nextCameraId = i;
                break;
            }
        }
        return nextCameraId;
    }

    public void switchCamera() {
        // check for availability of multiple cameras
        if (numberOfCameras == 1) {
            //There is only one camera available
        } else {
            Log.d(TAG, "numberOfCameras: " + numberOfCameras);

            // OK, we have multiple cameras. Release this camera -> cameraCurrentlyLocked
            if (mCamera != null) {
                mCamera.stopPreview();
                mPreview.setCamera(null, -1);
                mCamera.release();
                mCamera = null;
            }

            Log.d(TAG, "cameraCurrentlyLocked := " + Integer.toString(cameraCurrentlyLocked));
            try {
                cameraCurrentlyLocked = getNextCameraId();
                Log.d(TAG, "cameraCurrentlyLocked new: " + cameraCurrentlyLocked);
            } catch (Exception exception) {
                Log.d(TAG, exception.getMessage());
            }

            // Acquire the next camera and request Preview to reconfigure parameters.
            mCamera = Camera.open(cameraCurrentlyLocked);

            if (cameraParameters != null) {
                Log.d(TAG, "camera parameter not null");

                // Check for flashMode as well to prevent error on frontward facing camera.
                List<String> supportedFlashModesNewCamera = mCamera.getParameters().getSupportedFlashModes();
                String currentFlashModePreviousCamera = cameraParameters.getFlashMode();
                if (supportedFlashModesNewCamera != null && supportedFlashModesNewCamera.contains(currentFlashModePreviousCamera)) {
                    Log.d(TAG, "current flash mode supported on new camera. setting params");
                    /* mCamera.setParameters(cameraParameters);
            The line above is disabled because parameters that can actually be changed are different from one device to another. Makes less sense trying to reconfigure them when changing camera device while those settings gan be changed using plugin methods.
         */
                } else {
                    Log.d(TAG, "current flash mode NOT supported on new camera");
                }
            } else {
                Log.d(TAG, "camera parameter NULL");
            }

            mPreview.switchCamera(mCamera, cameraCurrentlyLocked);

            mCamera.startPreview();
        }
    }

    public void setCameraParameters(Camera.Parameters params) {
        cameraParameters = params;

        if (mCamera != null && cameraParameters != null) {
            mCamera.setParameters(cameraParameters);
        }
    }

    public boolean hasFrontCamera() {
        return getActivity().getApplicationContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT);
    }

    public static Bitmap applyMatrix(Bitmap source, Matrix matrix) {
        return Bitmap.createBitmap(source, 0, 0, source.getWidth(), source.getHeight(), matrix, true);
    }

    ShutterCallback shutterCallback = new ShutterCallback() {
        public void onShutter() {
            // do nothing, availabilty of this callback causes default system shutter sound to work
        }
    };

    private static int exifToDegrees(int exifOrientation) {
        if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_90) {
            return 90;
        } else if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_180) {
            return 180;
        } else if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_270) {
            return 270;
        }
        return 0;
    }

    private String getTempDirectoryPath() {
        File cache = null;

        // Use internal storage
        cache = getActivity().getCacheDir();

        // Create the cache directory if it doesn't exist
        cache.mkdirs();
        return cache.getAbsolutePath();
    }

    private String getTempFilePath() {
        return getTempDirectoryPath() + "/cpcp_capture_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + ".jpg";
    }

    PictureCallback jpegPictureCallback = new PictureCallback() {
        public void onPictureTaken(byte[] data, Camera arg1) {
            Log.d(TAG, "CameraPreview jpegPictureCallback");

            try {
                if (!disableExifHeaderStripping) {
                    Matrix matrix = new Matrix();
                    if (cameraCurrentlyLocked == Camera.CameraInfo.CAMERA_FACING_FRONT) {
                        matrix.preScale(1.0f, -1.0f);
                    }

                    ExifInterface exifInterface = new ExifInterface(new ByteArrayInputStream(data));
                    int rotation = exifInterface.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                    int rotationInDegrees = exifToDegrees(rotation);

                    if (rotation != 0f) {
                        matrix.preRotate(rotationInDegrees);
                    }

                    // Check if matrix has changed. In that case, apply matrix and override data
                    if (!matrix.isIdentity()) {
                        Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length);
                        bitmap = applyMatrix(bitmap, matrix);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        bitmap.compress(CompressFormat.JPEG, currentQuality, outputStream);
                        data = outputStream.toByteArray();
                    }
                }

                if (!storeToFile) {
                    String encodedImage = Base64.encodeToString(data, Base64.NO_WRAP);

                    eventListener.onPictureTaken(encodedImage);
                } else {
                    String path = getTempFilePath();
                    FileOutputStream out = new FileOutputStream(path);
                    out.write(data);
                    out.close();
                    eventListener.onPictureTaken(path);
                }
                Log.d(TAG, "CameraPreview pictureTakenHandler called back");
            } catch (OutOfMemoryError e) {
                // most likely failed to allocate memory for rotateBitmap
                Log.d(TAG, "CameraPreview OutOfMemoryError");
                // failed to allocate memory
                eventListener.onPictureTakenError("Picture too large (memory)");
            } catch (IOException e) {
                Log.d(TAG, "CameraPreview IOException");
                eventListener.onPictureTakenError("IO Error when extracting exif");
            } catch (Exception e) {
                Log.d(TAG, "CameraPreview onPictureTaken general exception");
            } finally {
                canTakePicture = true;
                mCamera.startPreview();
            }
        }
    };

    private Camera.Size getOptimalPictureSize(
        final int width,
        final int height,
        final Camera.Size previewSize,
        final List<Camera.Size> supportedSizes
    ) {
        /*
      get the supportedPictureSize that:
      - matches exactly width and height
      - has the closest aspect ratio to the preview aspect ratio
      - has picture.width and picture.height closest to width and height
      - has the highest supported picture width and height up to 2 Megapixel if width == 0 || height == 0
    */
        Camera.Size size = mCamera.new Size(width, height);

        // convert to landscape if necessary
        if (size.width < size.height) {
            int temp = size.width;
            size.width = size.height;
            size.height = temp;
        }

        Camera.Size requestedSize = mCamera.new Size(size.width, size.height);

        double previewAspectRatio = (double) previewSize.width / (double) previewSize.height;

        if (previewAspectRatio < 1.0) {
            // reset ratio to landscape
            previewAspectRatio = 1.0 / previewAspectRatio;
        }

        Log.d(TAG, "CameraPreview previewAspectRatio " + previewAspectRatio);

        double aspectTolerance = 0.1;
        double bestDifference = Double.MAX_VALUE;

        for (int i = 0; i < supportedSizes.size(); i++) {
            Camera.Size supportedSize = supportedSizes.get(i);

            // Perfect match
            if (supportedSize.equals(requestedSize)) {
                Log.d(TAG, "CameraPreview optimalPictureSize " + supportedSize.width + 'x' + supportedSize.height);
                return supportedSize;
            }

            double difference = Math.abs(previewAspectRatio - ((double) supportedSize.width / (double) supportedSize.height));

            if (difference < bestDifference - aspectTolerance) {
                // better aspectRatio found
                if ((width != 0 && height != 0) || (supportedSize.width * supportedSize.height < 2048 * 1024)) {
                    size.width = supportedSize.width;
                    size.height = supportedSize.height;
                    bestDifference = difference;
                }
            } else if (difference < bestDifference + aspectTolerance) {
                // same aspectRatio found (within tolerance)
                if (width == 0 || height == 0) {
                    // set highest supported resolution below 2 Megapixel
                    if ((size.width < supportedSize.width) && (supportedSize.width * supportedSize.height < 2048 * 1024)) {
                        size.width = supportedSize.width;
                        size.height = supportedSize.height;
                    }
                } else {
                    // check if this pictureSize closer to requested width and height
                    if (
                        Math.abs(width * height - supportedSize.width * supportedSize.height) <
                        Math.abs(width * height - size.width * size.height)
                    ) {
                        size.width = supportedSize.width;
                        size.height = supportedSize.height;
                    }
                }
            }
        }
        Log.d(TAG, "CameraPreview optimalPictureSize " + size.width + 'x' + size.height);
        return size;
    }

    static byte[] rotateNV21(final byte[] yuv, final int width, final int height, final int rotation) {
        if (rotation == 0) return yuv;
        if (rotation % 90 != 0 || rotation < 0 || rotation > 270) {
            throw new IllegalArgumentException("0 <= rotation < 360, rotation % 90 == 0");
        }

        final byte[] output = new byte[yuv.length];
        final int frameSize = width * height;
        final boolean swap = rotation % 180 != 0;
        final boolean xflip = rotation % 270 != 0;
        final boolean yflip = rotation >= 180;

        for (int j = 0; j < height; j++) {
            for (int i = 0; i < width; i++) {
                final int yIn = j * width + i;
                final int uIn = frameSize + (j >> 1) * width + (i & ~1);
                final int vIn = uIn + 1;

                final int wOut = swap ? height : width;
                final int hOut = swap ? width : height;
                final int iSwapped = swap ? j : i;
                final int jSwapped = swap ? i : j;
                final int iOut = xflip ? wOut - iSwapped - 1 : iSwapped;
                final int jOut = yflip ? hOut - jSwapped - 1 : jSwapped;

                final int yOut = jOut * wOut + iOut;
                final int uOut = frameSize + (jOut >> 1) * wOut + (iOut & ~1);
                final int vOut = uOut + 1;

                output[yOut] = (byte) (0xff & yuv[yIn]);
                output[uOut] = (byte) (0xff & yuv[uIn]);
                output[vOut] = (byte) (0xff & yuv[vIn]);
            }
        }
        return output;
    }

    public void setOpacity(final float opacity) {
        Log.d(TAG, "set opacity:" + opacity);
        this.opacity = opacity;
        mPreview.setOpacity(opacity);
    }

    public void takeSnapshot(final int quality) {
        mCamera.setPreviewCallback(
            new Camera.PreviewCallback() {
                @Override
                public void onPreviewFrame(byte[] bytes, Camera camera) {
                    try {
                        Camera.Parameters parameters = camera.getParameters();
                        Camera.Size size = parameters.getPreviewSize();
                        int orientation = mPreview.getDisplayOrientation();
                        if (mPreview.getCameraFacing() == Camera.CameraInfo.CAMERA_FACING_FRONT) {
                            bytes = rotateNV21(bytes, size.width, size.height, (360 - orientation) % 360);
                        } else {
                            bytes = rotateNV21(bytes, size.width, size.height, orientation);
                        }
                        // switch width/height when rotating 90/270 deg
                        Rect rect = orientation == 90 || orientation == 270
                            ? new Rect(0, 0, size.height, size.width)
                            : new Rect(0, 0, size.width, size.height);
                        YuvImage yuvImage = new YuvImage(bytes, parameters.getPreviewFormat(), rect.width(), rect.height(), null);
                        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                        yuvImage.compressToJpeg(rect, quality, byteArrayOutputStream);
                        byte[] data = byteArrayOutputStream.toByteArray();
                        byteArrayOutputStream.close();
                        eventListener.onSnapshotTaken(Base64.encodeToString(data, Base64.NO_WRAP));
                    } catch (IOException e) {
                        Log.d(TAG, "CameraPreview IOException");
                        eventListener.onSnapshotTakenError("IO Error");
                    } finally {
                        mCamera.setPreviewCallback(null);
                    }
                }
            }
        );
    }

    public void takePicture(final int width, final int height, final int quality) {
        Log.d(TAG, "CameraPreview takePicture width: " + width + ", height: " + height + ", quality: " + quality);

        if (mPreview != null) {
            if (!canTakePicture) {
                return;
            }

            canTakePicture = false;

            new Thread() {
                public void run() {
                    Camera.Parameters params = mCamera.getParameters();

                    Camera.Size size = getOptimalPictureSize(width, height, params.getPreviewSize(), params.getSupportedPictureSizes());
                    params.setPictureSize(size.width, size.height);
                    currentQuality = quality;

                    if (cameraCurrentlyLocked == Camera.CameraInfo.CAMERA_FACING_FRONT && !storeToFile) {
                        // The image will be recompressed in the callback
                        params.setJpegQuality(99);
                    } else {
                        params.setJpegQuality(quality);
                    }

                    if (cameraCurrentlyLocked == Camera.CameraInfo.CAMERA_FACING_FRONT && disableExifHeaderStripping) {
                        Activity activity = getActivity();
                        int rotation = activity.getWindowManager().getDefaultDisplay().getRotation();
                        int degrees = 0;
                        switch (rotation) {
                            case Surface.ROTATION_0:
                                degrees = 0;
                                break;
                            case Surface.ROTATION_90:
                                degrees = 180;
                                break;
                            case Surface.ROTATION_180:
                                degrees = 270;
                                break;
                            case Surface.ROTATION_270:
                                degrees = 0;
                                break;
                        }
                        int orientation;
                        Camera.CameraInfo info = new Camera.CameraInfo();
                        if (info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT) {
                            orientation = (info.orientation + degrees) % 360;
                            if (degrees != 0) {
                                orientation = (360 - orientation) % 360;
                            }
                        } else {
                            orientation = (info.orientation - degrees + 360) % 360;
                        }
                        params.setRotation(orientation);
                    } else {
                        params.setRotation(mPreview.getDisplayOrientation());
                    }

                    mCamera.setParameters(params);
                    mCamera.takePicture(shutterCallback, null, jpegPictureCallback);
                }
            }
                .start();
        } else {
            canTakePicture = true;
        }
    }

    public void startRecord(
        final String filePath,
        final String camera,
        final int width,
        final int height,
        final int quality,
        final boolean withFlash,
        final int maxDuration
    ) {
        Log.d(TAG, "CameraPreview startRecord camera: " + camera + " width: " + width + ", height: " + height + ", quality: " + quality);
        Activity activity = getActivity();
        muteStream(true, activity);
        if (this.mRecordingState == RecordingState.STARTED) {
            Log.d(TAG, "Already Recording");
            return;
        }

        this.recordFilePath = filePath;
        int mOrientationHint = calculateOrientationHint();
        int videoWidth = 0; //set whatever
        int videoHeight = 0; //set whatever

        Camera.Parameters cameraParams = mCamera.getParameters();
        if (withFlash) {
            cameraParams.setFlashMode(withFlash ? Camera.Parameters.FLASH_MODE_TORCH : Camera.Parameters.FLASH_MODE_OFF);
            mCamera.setParameters(cameraParams);
            mCamera.startPreview();
        }

        mCamera.unlock();
        mRecorder = new MediaRecorder();

        try {
            mRecorder.setCamera(mCamera);

            CamcorderProfile profile;
            if (CamcorderProfile.hasProfile(defaultCameraId, CamcorderProfile.QUALITY_HIGH)) {
                profile = CamcorderProfile.get(defaultCameraId, CamcorderProfile.QUALITY_HIGH);
            } else {
                if (CamcorderProfile.hasProfile(defaultCameraId, CamcorderProfile.QUALITY_480P)) {
                    profile = CamcorderProfile.get(defaultCameraId, CamcorderProfile.QUALITY_480P);
                } else {
                    if (CamcorderProfile.hasProfile(defaultCameraId, CamcorderProfile.QUALITY_720P)) {
                        profile = CamcorderProfile.get(defaultCameraId, CamcorderProfile.QUALITY_720P);
                    } else {
                        if (CamcorderProfile.hasProfile(defaultCameraId, CamcorderProfile.QUALITY_1080P)) {
                            profile = CamcorderProfile.get(defaultCameraId, CamcorderProfile.QUALITY_1080P);
                        } else {
                            profile = CamcorderProfile.get(defaultCameraId, CamcorderProfile.QUALITY_LOW);
                        }
                    }
                }
            }

            mRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            mRecorder.setVideoSource(MediaRecorder.VideoSource.CAMERA);
            mRecorder.setProfile(profile);
            mRecorder.setOutputFile(filePath);
            mRecorder.setOrientationHint(mOrientationHint);
            mRecorder.setMaxDuration(maxDuration);

            mRecorder.prepare();
            Log.d(TAG, "Starting recording");
            mRecorder.start();
            eventListener.onStartRecordVideo();
        } catch (IOException e) {
            eventListener.onStartRecordVideoError(e.getMessage());
        }
    }

    public int calculateOrientationHint() {
        DisplayMetrics dm = new DisplayMetrics();
        Camera.CameraInfo info = new Camera.CameraInfo();
        Camera.getCameraInfo(defaultCameraId, info);
        int cameraRotationOffset = info.orientation;
        Activity activity = getActivity();

        activity.getWindowManager().getDefaultDisplay().getMetrics(dm);
        int currentScreenRotation = activity.getWindowManager().getDefaultDisplay().getRotation();

        int degrees = 0;
        switch (currentScreenRotation) {
            case Surface.ROTATION_0:
                degrees = 0;
                break;
            case Surface.ROTATION_90:
                degrees = 90;
                break;
            case Surface.ROTATION_180:
                degrees = 180;
                break;
            case Surface.ROTATION_270:
                degrees = 270;
                break;
        }

        int orientation;
        if (info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT) {
            orientation = (cameraRotationOffset + degrees) % 360;
            if (degrees != 0) {
                orientation = (360 - orientation) % 360;
            }
        } else {
            orientation = (cameraRotationOffset - degrees + 360) % 360;
        }
        Log.w(TAG, "************orientationHint ***********= " + orientation);

        return orientation;
    }

    public void stopRecord() {
        Log.d(TAG, "stopRecord");

        try {
            mRecorder.stop();
            mRecorder.reset(); // clear recorder configuration
            mRecorder.release(); // release the recorder object
            mRecorder = null;
            mCamera.lock();
            Camera.Parameters cameraParams = mCamera.getParameters();
            cameraParams.setFlashMode(Camera.Parameters.FLASH_MODE_OFF);
            mCamera.setParameters(cameraParams);
            mCamera.startPreview();
            eventListener.onStopRecordVideo(this.recordFilePath);
        } catch (Exception e) {
            eventListener.onStopRecordVideoError(e.getMessage());
        }
    }

    public void muteStream(boolean mute, Activity activity) {
        AudioManager audioManager = ((AudioManager) activity.getApplicationContext().getSystemService(Context.AUDIO_SERVICE));
        int direction = mute ? audioManager.ADJUST_MUTE : audioManager.ADJUST_UNMUTE;
    }

    public void setFocusArea(final int pointX, final int pointY, final Camera.AutoFocusCallback callback) {
        if (mCamera != null) {
            mCamera.cancelAutoFocus();

            Camera.Parameters parameters = mCamera.getParameters();

            Rect focusRect = calculateTapArea(pointX, pointY, 1f);
            parameters.setFocusMode(Camera.Parameters.FOCUS_MODE_AUTO);
            parameters.setFocusAreas(Arrays.asList(new Camera.Area(focusRect, 1000)));

            if (parameters.getMaxNumMeteringAreas() > 0) {
                Rect meteringRect = calculateTapArea(pointX, pointY, 1.5f);
                parameters.setMeteringAreas(Arrays.asList(new Camera.Area(meteringRect, 1000)));
            }

            try {
                setCameraParameters(parameters);
                mCamera.autoFocus(callback);
            } catch (Exception e) {
                Log.d(TAG, e.getMessage());
                callback.onAutoFocus(false, this.mCamera);
            }
        }
    }

    private Rect calculateTapArea(float x, float y, float coefficient) {
        if (x < 100) {
            x = 100;
        }
        if (x > width - 100) {
            x = width - 100;
        }
        if (y < 100) {
            y = 100;
        }
        if (y > height - 100) {
            y = height - 100;
        }
        return new Rect(
            Math.round(((x - 100) * 2000) / width - 1000),
            Math.round(((y - 100) * 2000) / height - 1000),
            Math.round(((x + 100) * 2000) / width - 1000),
            Math.round(((y + 100) * 2000) / height - 1000)
        );
    }

    /**
     * Determine the space between the first two fingers
     */
    private static float getFingerSpacing(MotionEvent event) {
        // ...
        float x = event.getX(0) - event.getX(1);
        float y = event.getY(0) - event.getY(1);
        return (float) Math.sqrt(x * x + y * y);
    }
}
