export interface PurchaseInfo {
  /**
   * The amount to be paid.
   */
  amount: number;

  /**
   * The description of the purchase.
   */
  purchaseDescription: string;

  /**
   * The phone number of the customer.
   */
  customerPhoneNumber: string;

  /**
   * The client reference.
   */
  clientReference: string;

}


export type AllowedChannelsType = "paySmallSmall" |  "mobileMoney" | "bankCard" | "wallets" | "cashOrCheque";

export interface Config {
  /**
   * The branding option. If enabled, the merchant name will display at the top payment channels.
   * @default "enabled"
   */
  branding?: "enabled" | "disabled";

  /**
   * The URL to which the payment response will be sent.
   */
  callbackUrl: string;

  /**
   * The branch ID. This is required for internal integrations.
   */
  branchId?: string;

  /**
   * The business ID. This is required for internal integrations.
   */
  businessId?: string;

  /**
   * The bearer token of the user making the payment. This is required for internal integrations.
   */
  bearerToken?: string;

  /**
   * The merchant account number. This is required for external integrations.
   */
  merchantAccount?: number;

  /**
   * The basic authentication token. This is required for external integrations.
   */
  basicAuth?: string;

  /**
   * The integration type. This can be either "Internal" or "External".
   */
  integrationType?: "Internal" | "External" | null;

  /**
   * The list of channels to be displayed. If this is not provided, all channels will be displayed based on the configuration for the merchant.
   * @default null
   */

  allowedChannels?:  AllowedChannelsType[] | null;

}

export interface Initiate {
  /**
   * A boolean value indicating whether the checkout has been initialized.
   */
  initialized: boolean;
}

export interface PaymentSuccess {
  /**
   * A boolean value indicating whether the payment was successful.
   */
  success: boolean,

  /**
   * The mobile number of the customer.
   */
  mobileNumber: string,

  /**
   * The json string of payment data.
   */
  data: string
}


export interface PaymentFailure {
  /**
   * A boolean value indicating whether the payment was successful.
   */
  success: boolean,

  /**
   * A message indicating the reason for the payment failure.
  */
  message: string,

  /**
   * The mobile number of the customer.
   */
  mobileNumber: string,

  /**
   * The json string of payment data.
   */
  data: string
}

export interface ResizeData {
  /**
   * The new height of the iframe.
   */
  height?: number;
  /**
   * The new width of the iframe.
   */
  width?: number;
}

export interface Callbacks {

  /**
   * A callback function that is called when the checkout is initialized.
   * @param data - Contains initialization status information.
   */
  onInit?: (data: Initiate) => void;

  /**
   * A callback function that is called when the payment is successful.
   * @param data - Contains payment success information including mobile number and transaction data.
   */
  onPaymentSuccess?: (data: PaymentSuccess) => void;

  /**
   * A callback function that is called when the payment fails.
   * @param data - Contains failure information including error message and mobile number.
   */
  onPaymentFailure?: (data: PaymentFailure) => void;

  /**
   * A callback function that is called when the iframe is loaded.
   */
  onLoad?: () => void;

  /**
   * A callback function that is called when the fees are changed.
   * @param fees - A JSON string representing the new fees structure.
   */
  onFeesChanged?: (fees: string) => void;

  /**
   * A callback function that is called when the iframe is resized.
   * @param data - Contains the new dimensions of the iframe.
   */
  onResize?: (data: ResizeData) => void;

  /**
   * A callback function that is called when the checkout modal is closed.
   */
  onClose?: () => void;

  /**
   * @deprecated Use onInit instead. This callback is maintained for backwards compatibility.
   * A callback function that is called when the checkout is initialized.
   * @param data - Contains initialization status information.
   */
  init?: (data: Initiate) => void;
}

export interface IframeStyle {
  width?: string;
  height?: string;
  border?: string;
  minHeight?: string;
}

/**
 * The `CheckoutSdk` class provides methods for redirecting to the checkout page,
 * initializing an iframe for checkout, opening a modal for checkout, and closing the modal.
 */


export class CheckoutSdk {
 private baseUrl = "https://unified-pay.hubtel.com";
 private messageHandler: ((event: MessageEvent) => void) | null = null;
 private stylesInjected = false;

  constructor(url?: string) {
    if (url) this.baseUrl = url;
  }

  /**
 * Redirects the user to the checkout page with the provided purchase information and configuration.
 * @param purchaseInfo - The purchase information.
 * @param config - The configuration.
 * @throws {Error} If the popup is blocked by the browser.
 */
  redirect({ purchaseInfo, config }: { purchaseInfo: PurchaseInfo; config: Config }) {
    const url = this.createCheckoutUrl(purchaseInfo, config);
    const popup = window.open(url);
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      throw new Error("Popup was blocked by the browser. Please allow popups for this site.");
    }
  }

  /**
* Initializes the iframe for the checkout process.
*
* @param purchaseInfo - The purchase information.
* @param callBacks - The callback functions.
* @param config - The configuration settings.
* @param iframeStyle - The style options for the iframe (optional).
* @throws {Error} If the container element with id "hubtel-checkout-iframe" is not found.
*/
  initIframe({
    purchaseInfo,
    callBacks,
    config,
    iframeStyle,
  }: {
    purchaseInfo: PurchaseInfo;
    callBacks: Callbacks;
    config: Config;
    iframeStyle?: IframeStyle;
  }) {
    this.registerEvents(callBacks);
    const iframeContainer = document.getElementById("hubtel-checkout-iframe");
    if (!iframeContainer) {
      throw new Error("Container element with id \"hubtel-checkout-iframe\" not found in the DOM.");
    }
    iframeContainer.innerHTML = "";
    const loadingIcon = document.createElement("div");
    loadingIcon.textContent = "Loading...";
    iframeContainer.appendChild(loadingIcon);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("id", "hubtel-iframe-element");
    iframe.src = this.createCheckoutUrl(purchaseInfo, config);
    iframe.style.display = "none";
    iframe.style.width = iframeStyle?.width ?? "100%";
    iframe.style.height = iframeStyle?.height ?? "100%";
    iframe.style.minHeight = iframeStyle?.minHeight || "400px";
    iframe.style.border = iframeStyle?.border ?? "none";
    iframe.onload = () => {
      iframeContainer.removeChild(loadingIcon);
      iframe.style.display = "block";
      callBacks.onLoad?.();
    };
    iframeContainer.appendChild(iframe);
  }


  openModal({
    purchaseInfo,
    callBacks,
    config,
  }: {
    purchaseInfo: PurchaseInfo;
    callBacks: Callbacks;
    config: Config;
  }) {
    this.injectStyles();
    this.createIframe();
    this.handleBackButton();
    this.registerEvents(callBacks);
    this.renderWebpageInPopup(
      this.createCheckoutUrl(purchaseInfo, config),
      callBacks.onClose,
      callBacks.onLoad
    );
  }

  private createCheckoutUrl(purchaseInfo: PurchaseInfo, config: Config): string {
    const checkoutData: Record<string, any> = { ...purchaseInfo, ...config };

    const filteredData = Object.keys(checkoutData).reduce((acc, key) => {
      if (checkoutData[key] !== null && checkoutData[key] !== undefined) {
        acc[key] = checkoutData[key];
      }
      return acc;
    }, {} as { [key: string]: any });

    const queryString = Object.keys(filteredData)
      .map((key) => `${key}=${encodeURIComponent(filteredData[key])}`)
      .join("&");
    const encodedQuery = this.encodeBase64(queryString);
    const encryptedTarget = encodeURIComponent(encodedQuery);
    const url =
      filteredData?.branding === "disabled"
        ? `${this.baseUrl}/pay/direct`
        : `${this.baseUrl}/pay`;
    return `${url}?p=${encryptedTarget}`;
  }

  private encodeBase64(data: any) {
    return btoa(unescape(encodeURIComponent(data)));
  }

  private handleBackButton() {
    window.addEventListener("popstate", () => {
      this.closePopUp();
    });
  }

  private createIframe() {
    const backdrop = document.createElement("div");
    backdrop.setAttribute("id", "backdrop");
    backdrop.classList.add("backdrop");
    const loader = document.createElement("span");
    loader.classList.add("checkout-loader");
    backdrop.appendChild(loader);
    document.body.appendChild(backdrop);
  }

  private registerEvents(callBacks: Callbacks) {
    // Clean up previous event listener if it exists
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler, false);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== this.baseUrl) return;
      const { data } = event;
      if (data.success === true ) {
        callBacks.onPaymentSuccess?.(data);
      } else if (data.success === false ) {
        callBacks.onPaymentFailure?.(data);
      } else if (data.initialized ) {
        callBacks.init?.(data);
        callBacks.onInit?.(data);
      } else if (data.feesChanged ) {
        callBacks.onFeesChanged?.(data.fees);
      } else if (data.resize ) {
        const iframe = document.getElementById("hubtel-iframe-element");
        if (iframe) {
          iframe.style.height = data.height + "px";
        }
        callBacks?.onResize?.(data);
      }
    };

    this.messageHandler = handleMessage;
    window.addEventListener("message", handleMessage, false);
  }

  /**
   * Removes the message event listener to prevent memory leaks.
   * Call this method when you're done with the checkout to clean up resources.
   */
  destroy() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler, false);
      this.messageHandler = null;
    }
  }

  private renderWebpageInPopup(url: string, onClose: any, onLoad: any) {
    const modal = document.createElement("div");
    modal.classList.add("checkout-modal");
    const closeIcon = document.createElement("div");
    closeIcon.setAttribute("id", "checkout-close-icon");
    closeIcon.innerHTML = "&times;";
    closeIcon.classList.add("close-icon");
    closeIcon.addEventListener("click", () => {
      this.closePopUp();
      onClose?.();
    });
    modal.appendChild(closeIcon);
    const iframe = document.createElement("iframe");
    iframe.src = url;
    history.pushState({ modalOpen: true }, "");
    iframe.classList.add("iframe");
    modal.appendChild(iframe);
    document.body.appendChild(modal);
    modal.style.opacity = "0";
    iframe.addEventListener("load", () => {
      modal.style.opacity = "1";
      onLoad?.();
    });
  }

  closePopUp() {

    const backdrop = document.querySelector(".backdrop");
    const modal = document.querySelector(".checkout-modal");
    if (backdrop) {
      document.body.removeChild(backdrop);
    }
    if (modal) {
      document.body.removeChild(modal);
    }
    history.replaceState(null, "");
    window.removeEventListener("popstate", this.closePopUp);

  }

  private injectStyles() {
    // Prevent injecting styles multiple times
    if (this.stylesInjected) return;

    const style = document.createElement("style");
    style.type = "text/css";
    style.setAttribute("data-hubtel-checkout", "true");
    style.innerHTML = `
        .backdrop {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999998;
        }

        .loader {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999999;
            /* Your loader styles */
        }

        .checkout-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            height: 90%;
            padding-top: 20px;
            max-width: 480px;
            background-color: #fff;
            border-radius: 10px;
            z-index: 1000000;
            transition: opacity 0.5s ease, transform 0.5s ease;
            opacity: 0;
        }

        .close-icon {
            position: absolute;
            top: 10px;
            width: 25px;
            height: 25px;
            font-size: 20px;
            right: 10px;
            cursor: pointer;
            color: #fff;
            background-color: #000;
            text-align: center;
            border-radius: 50%;
        }

        .iframe {
            width: 100%;
            height: calc(100% - 20px);
            border: none;
        }

        .checkout-loader {
          width: 30px;
          height: 30px;
          border: 3px solid #FFF;
          border-bottom-color: #42b883;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          position : fixed;
          top : 50%;
          left : 50%;
          transform : translate(-50%, -50%);
          z-index : 999999;
          animation: rotation 1s linear infinite;
      }

      @keyframes rotation {
          0% {
              transform: rotate(0deg);
          }
          100% {
              transform: rotate(360deg);
          }
      }

      @media screen and (max-width: 600px) {
          .checkout-modal {
              width: 100%;
              height: 100%;
              border-radius: 0;
              padding-bottom: 0px;
              padding-top: 0px;
          }
          .close-icon{
            top: 10px;
            right: 15px;
          }

          .iframe {

            height: 100%;

        }
      }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }
}

