﻿import {
    ImageSource, ImageAsset, ImageBase, stretchProperty, imageSourceProperty, srcProperty, tintColorProperty, Color,
    isDataURI, isFileOrResourcePath, RESOURCE_PREFIX
} from "./image-common";
import { knownFolders } from "../../file-system";

export * from "./image-common";

const FILE_PREFIX = "file:///";
const ASYNC = "async";

let AndroidImageView: typeof org.nativescript.widgets.ImageView;

interface ImageLoadedListener {
    new (owner: Image): org.nativescript.widgets.image.Worker.OnImageLoadedListener;
}

let ImageLoadedListener: ImageLoadedListener;
function initializeImageLoadedListener() {
    if (ImageLoadedListener) {
        return;
    }

    @Interfaces([org.nativescript.widgets.image.Worker.OnImageLoadedListener])
    class ImageLoadedListenerImpl extends java.lang.Object implements org.nativescript.widgets.image.Worker.OnImageLoadedListener {
        constructor(public owner: Image) {
            super();
            return global.__native(this);
        }

        onImageLoaded(success: boolean): void {
            const owner = this.owner;
            if (owner) {
                owner.isLoading = false;
            }
        }
    }

    ImageLoadedListener = ImageLoadedListenerImpl;
}

export class Image extends ImageBase {
    nativeViewProtected: org.nativescript.widgets.ImageView;

    public decodeWidth = 0;
    public decodeHeight = 0;
    public useCache = true;

    public createNativeView() {
        if (!AndroidImageView) {
            AndroidImageView = org.nativescript.widgets.ImageView;
        }
        initializeImageLoadedListener();
        
        const imageView = new AndroidImageView(this._context);
        const listener = new ImageLoadedListener(this);
        imageView.setImageLoadedListener(listener);
        (<any>imageView).listener = listener;

        return imageView;
    }

    public initNativeView(): void {
        super.initNativeView();
        (<any>this.nativeViewProtected).listener.owner = this;
    }

    public disposeNativeView() {
        (<any>this.nativeViewProtected).listener.owner = null;
        super.disposeNativeView();
    }

    public resetNativeView(): void {
        super.resetNativeView();
        this.nativeViewProtected.setImageMatrix(new android.graphics.Matrix());        
    }

    public _createImageSourceFromSrc(value: string | ImageSource | ImageAsset) {
        const imageView = this.nativeViewProtected;
        if (!imageView) {
            return;
        }

        if (!value) {
            imageView.setUri(null, 0, 0, false, true);
            return;
        }

        const async = this.loadMode === ASYNC;

        if (typeof value === "string" || value instanceof String) {
            value = value.trim();
            this.isLoading = true;

            if (isDataURI(value)) {
                // TODO: Check with runtime what should we do in case of base64 string.
                super._createImageSourceFromSrc(value);
            } else if (isFileOrResourcePath(value)) {
                if (value.indexOf(RESOURCE_PREFIX) === 0) {
                    imageView.setUri(value, this.decodeWidth, this.decodeHeight, this.useCache, async);
                } else {
                    let fileName = value;
                    if (fileName.indexOf("~/") === 0) {
                        fileName = knownFolders.currentApp().path + "/" + fileName.replace("~/", "");
                    }

                    imageView.setUri(FILE_PREFIX + fileName, this.decodeWidth, this.decodeHeight, this.useCache, async);
                }
            } else {
                // For backwards compatibility http always use async loading.
                imageView.setUri(value, this.decodeWidth, this.decodeHeight, this.useCache, true);
            }
        } else {
            super._createImageSourceFromSrc(value);
        }
    }

    [stretchProperty.getDefault](): "aspectFit" {
        return "aspectFit";
    }
    [stretchProperty.setNative](value: "none" | "aspectFill" | "aspectFit" | "fill") {
        switch (value) {
            case "aspectFit":
                this.nativeViewProtected.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
                break;
            case "aspectFill":
                this.nativeViewProtected.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
                break;
            case "fill":
                this.nativeViewProtected.setScaleType(android.widget.ImageView.ScaleType.FIT_XY);
                break;
            case "none":
            default:
                this.nativeViewProtected.setScaleType(android.widget.ImageView.ScaleType.MATRIX);
                break;
        }
    }

    [tintColorProperty.getDefault](): Color {
        return undefined;
    }
    [tintColorProperty.setNative](value: Color) {
        if (value === undefined) {
            this.nativeViewProtected.clearColorFilter();
        } else {
            this.nativeViewProtected.setColorFilter(value.android);
        }
    }

    [imageSourceProperty.getDefault](): ImageSource {
        return undefined;
    }
    [imageSourceProperty.setNative](value: ImageSource) {
        const nativeView = this.nativeViewProtected;
        if (value && value.android) {
            const rotation = value.rotationAngle ? value.rotationAngle : 0;
            nativeView.setRotationAngle(rotation);
            nativeView.setImageBitmap(value.android);
        } else {
            nativeView.setRotationAngle(0);
            nativeView.setImageBitmap(null);
        }
    }

    [srcProperty.getDefault](): any {
        return undefined;
    }
    [srcProperty.setNative](value: any) {
        this._createImageSourceFromSrc(value);
    }
}