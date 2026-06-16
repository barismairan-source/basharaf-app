// تایپ‌های ماژول مشتری آنلاین (OTP login برای /order/account)

export interface WebCustomer {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
}

export interface WebCustomerAddress {
  id: string;
  customerId: string;
  title: string;
  address: string;
  lat: string | null;
  lng: string | null;
  isDefault: boolean;
  sortOrder: number;
}

export interface WebCustomerAddressInput {
  title: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
}

export interface WebCustomerOrder {
  id: string;
  orderNo: string;
  trackToken: string;
  status: string;
  serviceType: string;
  total: number;
  payMethod: string;
  payStatus: string;
  jalaliDate: string;
  createdAt: string;
}
