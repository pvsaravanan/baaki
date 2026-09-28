import type { StaticImageData } from "next/image";
import type { CategoryIconKey } from "@/lib/category-icons";
import biryani from "@/assets/icons/biryani.png";
import burger from "@/assets/icons/burger.png";
import ramen from "@/assets/icons/ramen.png";
import snack from "@/assets/icons/snack.png";
import diet from "@/assets/icons/diet.png";
import fruit from "@/assets/icons/fruit.png";
import vegetable from "@/assets/icons/vegetable.png";
import groceries from "@/assets/icons/groceries.png";
import cafe from "@/assets/icons/cafe.png";
import coffee from "@/assets/icons/coffee.png";
import drink from "@/assets/icons/drink.png";
import delivery from "@/assets/icons/delivery.png";
import shoppingBag from "@/assets/icons/shopping-bag.png";
import shoppingCart from "@/assets/icons/shopping-cart.png";
import onlineShopping from "@/assets/icons/online-shopping.png";
import maleClothes from "@/assets/icons/male-clothes.png";
import sneakers from "@/assets/icons/sneakers.png";
import accessories from "@/assets/icons/accessories.png";
import cream from "@/assets/icons/cream.png";
import personalHygiene from "@/assets/icons/personal-hygiene.png";
import giftbox from "@/assets/icons/giftbox.png";
import electronicDevices from "@/assets/icons/electronic-devices.png";
import laptop from "@/assets/icons/laptop.png";
import mobilePhone from "@/assets/icons/mobile-phone.png";
import house from "@/assets/icons/house.png";
import utilities from "@/assets/icons/utilities.png";
import bill from "@/assets/icons/bill.png";
import subscription from "@/assets/icons/subscription.png";
import application from "@/assets/icons/application.png";
import digital from "@/assets/icons/digital.png";
import platform from "@/assets/icons/platform.png";
import browsing from "@/assets/icons/browsing.png";
import car from "@/assets/icons/car.png";
import taxi from "@/assets/icons/taxi.png";
import bus from "@/assets/icons/bus.png";
import electricTrain from "@/assets/icons/electric-train.png";
import motorcycle from "@/assets/icons/motorcycle.png";
import gasPump from "@/assets/icons/gas-pump.png";
import parkingCar from "@/assets/icons/parking-car.png";
import toll from "@/assets/icons/toll.png";
import airplane from "@/assets/icons/airplane.png";
import airplaneTicket from "@/assets/icons/airplane-ticket.png";
import travel from "@/assets/icons/travel.png";
import travelLuggage from "@/assets/icons/travel-luggage.png";
import cruise from "@/assets/icons/cruise.png";
import ship from "@/assets/icons/ship.png";
import healthcare from "@/assets/icons/healthcare.png";
import healthCheck from "@/assets/icons/health-check.png";
import injection from "@/assets/icons/injection.png";
import insurance from "@/assets/icons/insurance.png";
import familyInsurance from "@/assets/icons/family-insurance.png";
import dumbbell from "@/assets/icons/dumbbell.png";
import weightlifter from "@/assets/icons/weightlifter.png";
import running from "@/assets/icons/running.png";
import cinema from "@/assets/icons/cinema.png";
import music from "@/assets/icons/music.png";
import gameController from "@/assets/icons/game-controller.png";
import happy from "@/assets/icons/happy.png";
import education from "@/assets/icons/education.png";
import graduation from "@/assets/icons/graduation.png";
import notebook from "@/assets/icons/notebook.png";
import moneySack from "@/assets/icons/money-sack.png";
import dollars from "@/assets/icons/dollars.png";
import payment from "@/assets/icons/payment.png";
import profits from "@/assets/icons/profits.png";
import accounting from "@/assets/icons/accounting.png";
import report from "@/assets/icons/report.png";
import assetUtilization from "@/assets/icons/asset-utilization.png";
import suitcase from "@/assets/icons/suitcase.png";
import paws from "@/assets/icons/paws.png";
import petFood from "@/assets/icons/pet-food.png";
import more from "@/assets/icons/more.png";
import menu from "@/assets/icons/menu.png";

/** Every category icon key → its bundled illustration (src/assets/icons). */
export const CATEGORY_ICON_IMAGES: Readonly<Record<CategoryIconKey, StaticImageData>> = {
  biryani,
  burger,
  ramen,
  snack,
  diet,
  fruit,
  vegetable,
  groceries,
  cafe,
  coffee,
  drink,
  delivery,
  "shopping-bag": shoppingBag,
  "shopping-cart": shoppingCart,
  "online-shopping": onlineShopping,
  "male-clothes": maleClothes,
  sneakers,
  accessories,
  cream,
  "personal-hygiene": personalHygiene,
  giftbox,
  "electronic-devices": electronicDevices,
  laptop,
  "mobile-phone": mobilePhone,
  house,
  utilities,
  bill,
  subscription,
  application,
  digital,
  platform,
  browsing,
  car,
  taxi,
  bus,
  "electric-train": electricTrain,
  motorcycle,
  "gas-pump": gasPump,
  "parking-car": parkingCar,
  toll,
  airplane,
  "airplane-ticket": airplaneTicket,
  travel,
  "travel-luggage": travelLuggage,
  cruise,
  ship,
  healthcare,
  "health-check": healthCheck,
  injection,
  insurance,
  "family-insurance": familyInsurance,
  dumbbell,
  weightlifter,
  running,
  cinema,
  music,
  "game-controller": gameController,
  happy,
  education,
  graduation,
  notebook,
  "money-sack": moneySack,
  dollars,
  payment,
  profits,
  accounting,
  report,
  "asset-utilization": assetUtilization,
  suitcase,
  paws,
  "pet-food": petFood,
  more,
  menu,
};
