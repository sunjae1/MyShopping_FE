import type { Item, User } from "./types";

export interface DemoSeedUser extends User {
  password: string;
}

export interface DemoSeedCategory {
  id: number;
  name: string;
}

export interface DemoSeedCartEntry {
  itemId: number;
  quantity: number;
}

export interface DemoSeedOrderLineItem {
  itemId: number;
  itemName: string;
  price: number;
  quantity: number;
}

export interface DemoSeedOrder {
  id: number;
  userId: number;
  orderDate: string;
  status: string;
  lineItems: DemoSeedOrderLineItem[];
}

export interface DemoSeedComment {
  id: number;
  userId: number;
  username: string;
  content: string;
  createdDate: string;
}

export interface DemoSeedPost {
  id: number;
  authorId: number;
  author: string;
  title: string;
  content: string;
  createdDate: string;
  comments: DemoSeedComment[];
}

export interface DemoStoreSeed {
  users: DemoSeedUser[];
  categories: DemoSeedCategory[];
  items: Item[];
  carts: Record<string, DemoSeedCartEntry[]>;
  orders: DemoSeedOrder[];
  posts: DemoSeedPost[];
  nextIds: {
    user: number;
    category: number;
    item: number;
    order: number;
    post: number;
    comment: number;
  };
}

const demoImageUrls = {
  graphicTee:
    "https://images.pexels.com/photos/33258835/pexels-photo-33258835.jpeg?auto=compress&cs=tinysrgb&w=1200",
  leatherJacket:
    "https://images.pexels.com/photos/12148300/pexels-photo-12148300.jpeg?auto=compress&cs=tinysrgb&w=1200",
  trenchCoat:
    "https://images.pexels.com/photos/9968540/pexels-photo-9968540.jpeg?auto=compress&cs=tinysrgb&w=1200",
  knitSweater:
    "https://images.pexels.com/photos/14463985/pexels-photo-14463985.jpeg?auto=compress&cs=tinysrgb&w=1200",
  denimJeans:
    "https://images.pexels.com/photos/4109798/pexels-photo-4109798.jpeg?auto=compress&cs=tinysrgb&w=1200",
  whiteSneakers:
    "https://images.pexels.com/photos/4252969/pexels-photo-4252969.jpeg?auto=compress&cs=tinysrgb&w=1200",
  blackHoodie:
    "https://images.pexels.com/photos/35408208/pexels-photo-35408208.jpeg?auto=compress&cs=tinysrgb&w=1200"
};

export function createDemoSeed(): DemoStoreSeed {
  return {
    users: [
      {
        id: 1,
        email: "demo@seoulselect.com",
        name: "서연",
        role: "USER",
        password: "demo123!"
      },
      {
        id: 2,
        email: "admin@seoulselect.com",
        name: "운영자",
        role: "ADMIN",
        password: "admin123!"
      },
      {
        id: 3,
        email: "mira@seoulselect.com",
        name: "미라",
        role: "USER",
        password: "style123!"
      }
    ],
    categories: [
      {
        id: 1,
        name: "아우터"
      },
      {
        id: 2,
        name: "상의"
      },
      {
        id: 3,
        name: "하의"
      },
      {
        id: 4,
        name: "슈즈"
      }
    ],
    items: [
      {
        id: 1,
        itemName: "스테이플 그래픽 티셔츠",
        price: 29000,
        quantity: 12,
        categoryId: 2,
        categoryName: "상의",
        imageUrl: demoImageUrls.graphicTee
      },
      {
        id: 2,
        itemName: "레더 클래식 재킷",
        price: 129000,
        quantity: 5,
        categoryId: 1,
        categoryName: "아우터",
        imageUrl: demoImageUrls.leatherJacket
      },
      {
        id: 3,
        itemName: "샌드 트렌치 코트",
        price: 149000,
        quantity: 7,
        categoryId: 1,
        categoryName: "아우터",
        imageUrl: demoImageUrls.trenchCoat
      },
      {
        id: 4,
        itemName: "코지 블루 니트",
        price: 69000,
        quantity: 8,
        categoryId: 2,
        categoryName: "상의",
        imageUrl: demoImageUrls.knitSweater
      },
      {
        id: 5,
        itemName: "스트레이트 데님 팬츠",
        price: 59000,
        quantity: 14,
        categoryId: 3,
        categoryName: "하의",
        imageUrl: demoImageUrls.denimJeans
      },
      {
        id: 6,
        itemName: "화이트 데일리 스니커즈",
        price: 79000,
        quantity: 9,
        categoryId: 4,
        categoryName: "슈즈",
        imageUrl: demoImageUrls.whiteSneakers
      },
      {
        id: 7,
        itemName: "어반 블랙 후디",
        price: 62000,
        quantity: 4,
        categoryId: 2,
        categoryName: "상의",
        imageUrl: demoImageUrls.blackHoodie
      }
    ],
    carts: {
      "1": [
        {
          itemId: 1,
          quantity: 1
        },
        {
          itemId: 6,
          quantity: 1
        }
      ],
      "2": [],
      "3": []
    },
    orders: [
      {
        id: 1,
        userId: 1,
        orderDate: "2026-03-14T11:20:00.000Z",
        status: "PAID",
        lineItems: [
          {
            itemId: 2,
            itemName: "레더 클래식 재킷",
            price: 129000,
            quantity: 1
          },
          {
            itemId: 5,
            itemName: "스트레이트 데님 팬츠",
            price: 59000,
            quantity: 1
          }
        ]
      },
      {
        id: 2,
        userId: 1,
        orderDate: "2026-03-02T08:45:00.000Z",
        status: "CANCELLED",
        lineItems: [
          {
            itemId: 4,
            itemName: "코지 블루 니트",
            price: 69000,
            quantity: 1
          }
        ]
      }
    ],
    posts: [
      {
        id: 1,
        authorId: 1,
        author: "서연",
        title: "봄 아우터 고를 때 핏 먼저 보는 편이에요",
        content:
          "요즘은 무조건 튀는 것보다 어깨선이 자연스럽고 오래 입을 수 있는 아우터를 더 찾게 돼요. 트렌치 코트는 슬랙스랑도 잘 어울리고 데님에도 가볍게 매치돼서 손이 자주 갑니다.",
        createdDate: "2026-03-18T10:39:00.000Z",
        comments: [
          {
            id: 1,
            userId: 3,
            username: "미라",
            content: "저도 트렌치 코트는 봄마다 꼭 꺼내 입어요. 데님이랑 조합이 정말 예쁘더라고요.",
            createdDate: "2026-03-18T12:05:00.000Z"
          }
        ]
      },
      {
        id: 2,
        authorId: 3,
        author: "미라",
        title: "화이트 스니커즈는 하나 있으면 진짜 든든해요",
        content:
          "포인트 강한 아이템이 아니어도 신발 하나만 깔끔하면 전체 룩이 정돈되어 보여요. 저는 청바지나 스커트 상관없이 자주 신게 되네요.",
        createdDate: "2026-03-17T06:20:00.000Z",
        comments: [
          {
            id: 2,
            userId: 1,
            username: "서연",
            content: "맞아요. 특히 출근할 때도 주말에도 다 잘 어울려서 손이 자주 가요.",
            createdDate: "2026-03-17T08:10:00.000Z"
          }
        ]
      },
      {
        id: 3,
        authorId: 1,
        author: "서연",
        title: "티셔츠는 결국 자주 입게 되는 기본템이 남더라고요",
        content:
          "프린트가 있더라도 소재가 탄탄하고 단독으로 입었을 때 핏이 깔끔한 티셔츠가 제일 오래 남아요. 가벼운 아우터 안에 받쳐 입기에도 좋아서 활용도가 높아요.",
        createdDate: "2026-03-15T14:10:00.000Z",
        comments: []
      }
    ],
    nextIds: {
      user: 4,
      category: 5,
      item: 8,
      order: 3,
      post: 4,
      comment: 3
    }
  };
}
