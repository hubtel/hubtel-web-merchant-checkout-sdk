interface PurchaseInfo {
  /**
   * @requires
   * The amount to be paid.
   */
  amount: number

  /**
   * @requires
   * The description of the purchase.
   */
  purchaseDescription: string

  /**
   * @requires
   * The phone number of the customer.
   */
  customerPhoneNumber: string

  /**
   * @requires
   * The client reference.
   */

  clientReference: string

  /**
   * @optional
   * The current longitude coordinate of the customer
   */
  longitude?: string

  /**
   * @optional
   * The current latitude coordinate of the customer
   */
  latitude?: string

  /**
   * @optional
   * The customer's ghana card number
   */
  ghanaCardNumber?: string
}

interface Config {
  /**
   * @optional
   * @default "enabled"
   * The branding option. If enabled, the merchant name will display at the top payment channels.
  */
  branding?: "enabled" | "disabled";

  /**
   * @requires
   * The URL to which the payment response will be sent.
   */
  callbackUrl: string;

  /**
   * @optional
   * The branch ID. This is required for internal integrations.
   */
  branchId?: string;

  /**
   * @optional
   * The business ID. This is required for internal integrations. 
   */
  businessId?: string;

  /**
   * @optional
   * The bearer token of the user making the payment. This is required for internal integrations.
   */
  bearerToken?: string;

  /* 
  *The merchant account number. This is required for external integrations.
  */
  merchantAccount?: number;

  /**
   * @optional
   * The basic authentication token. This is required for external integrations.
   */
  basicAuth?: string;

  /**
   * @requires
   * The integration type. This can be either "Internal" or "External".
   */
  integrationType?: "Internal" | "External" | null;

}

interface Initiate {
  /**
   * A boolean value indicating whether the checkout has been initialized.
   */
  initialized: boolean;
}

interface PaymentSuccess {
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


interface PaymentFailure {
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

interface Callbacks {

  /**
 * A callback function that is called when the checkout is initialized.
 * @param data - The data object.
 * @returns 
 */

  onInit?: (data: Initiate) => void;

  /**
   * A callback function that is called when the payment is successful.
   * @param data 
   */

  onPaymentSuccess?: (data: PaymentSuccess) => void;

  /**
   * A callback function that is called when the payment fails.
   * @param data 
   */
  onPaymentFailure?: (data: PaymentFailure) => void;

  /**
   * A callback function that is called when the iframe is loaded.
   */
  onLoad?: () => void;

  /**
   * A callback function that is called when the fees are changed.
   * @param fees - A json string representing the new fees.
   */
  onFeesChanged?: (fees: string) => void;

  /**
   * A callback function that is called when the iframe is resized.
   * @param data - The data object.
   */
  onResize?: (data: any) => void;

  /**
   * A callback function that is called when the checkout modal is closed.
   */
  onClose?: () => void;

  /**
   * A callback function that is called when the checkout is initialized.
   * @param data - The data object.
   * @returns 
   */
  init?: (data: any) => void;
}

interface IframeStyle {
  width?: string;
  height?: string;
  border?: string;
}

/**
 * The `CheckoutSdk` class provides methods for redirecting to the checkout page,
 * initializing an iframe for checkout, opening a modal for checkout, and closing the modal.
 */


class CheckoutSdk {
 private baseUrl = "https://unified-pay.hubtel.com";

  constructor(url?: string) {
    if (url) this.baseUrl = url;
  }

  /**
 * Redirects the user to the checkout page with the provided purchase information and configuration.
 * @param purchaseInfo - The purchase information.
 * @param config - The configuration.
 */
  redirect({ purchaseInfo, config }: { purchaseInfo: PurchaseInfo; config: Config }) {
    const url = this.createCheckoutUrl(purchaseInfo, config);
    window.open(url);
  }

  /**
* Initializes the iframe for the checkout process.
* 
* @param options - The options for initializing the iframe.
* @param options.purchaseInfo - The purchase information.
* @param options.callBacks - The callback functions.
* @param options.config - The configuration settings.
* @param options.iframeStyle - The style options for the iframe (optional).
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
    if (!iframeContainer) return;
    iframeContainer.innerHTML = "";
    const loadingIcon = document.createElement("div");
    loadingIcon.textContent = "Loading...";
    iframeContainer.appendChild(loadingIcon);
    const iframe = document.createElement("iframe");
    iframe.src = this.createCheckoutUrl(purchaseInfo, config);
    iframe.style.display = "none";
    iframe.style.width = iframeStyle?.width ?? "100%";
    iframe.style.height = iframeStyle?.height ?? "100%";
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
    this.registerEvents(callBacks);
    this.renderWebpageInPopup(
      this.createCheckoutUrl(purchaseInfo, config),
      callBacks.onClose,
      callBacks.onLoad
    );
  }

  private createCheckoutUrl(purchaseInfo: PurchaseInfo, config: Config): string {
    const checkoutData = { ...purchaseInfo, ...config };
    const queryString = Object.keys(checkoutData)
      .map((key) => `${key}=${encodeURIComponent((checkoutData as { [key: string]: any })[key])}`)
      .join("&");
    const url =
      checkoutData?.branding === "disabled"
        ? `${this.baseUrl}/pay/direct`
        : `${this.baseUrl}/pay`;
    return `${url}?${queryString}`;
  }

  private createIframe() {
    let backdrop = document.createElement("div");
    backdrop.setAttribute("id", "backdrop");
    backdrop.classList.add("backdrop");
    const loader = document.createElement("span");
    loader.classList.add("checkout-loader");
    backdrop.appendChild(loader);
    document.body.appendChild(backdrop);
  }

  private registerEvents(callBacks: Callbacks) {
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
        callBacks.onResize?.(data);
      }
    };
    window.addEventListener("message", handleMessage, false);
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
      console.log(backdrop);
      document.body.removeChild(backdrop);

    }
    if (modal) {
      document.body.removeChild(modal);
    }
   
  }

  private injectStyles() {
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
        .backdrop {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 2147483647;
        }

        .loader {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
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
            z-index: 65675656565;
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
          z-index : 10000;
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
  }
}



export default CheckoutSdk;

