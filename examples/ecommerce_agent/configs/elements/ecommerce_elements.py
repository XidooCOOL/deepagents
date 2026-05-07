"""
电商平台 DOM 元素预配置
包含各平台商品上架全流程的元素选择器
"""

# ==================== 拼多多平台 ====================
PINDUODUO_ELEMENTS = {
    "platform": "pinduoduo",
    "platform_name": "拼多多",
    "pages": {
        # ========== 登录页面 ==========
        "login": {
            "page_name": "登录页",
            "elements": [
                {
                    "name": "username_input",
                    "display_name": "用户名输入框",
                    "description": "手机号/用户名输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='username']"},
                        {"type": "css", "value": "input[placeholder*='手机']"},
                        {"type": "xpath", "value": "//input[contains(@placeholder,'手机')]"},
                        {"type": "id", "value": "username"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "password_input",
                    "display_name": "密码输入框",
                    "description": "密码输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='password']"},
                        {"type": "css", "value": "input[type='password']"},
                        {"type": "id", "value": "password"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "login_button",
                    "display_name": "登录按钮",
                    "description": "登录/确认按钮",
                    "selectors": [
                        {"type": "css", "value": "button[type='submit']"},
                        {"type": "css", "value": ".login-btn"},
                        {"type": "text", "value": "登录"},
                        {"type": "xpath", "value": "//button[contains(text(),'登录')]"}
                    ],
                    "action_type": "click"
                },
                {
                    "name": "verify_code_input",
                    "display_name": "验证码输入框",
                    "description": "短信验证码输入框",
                    "selectors": [
                        {"type": "css", "value": "input[placeholder*='验证码']"},
                        {"type": "css", "value": ".verify-code input"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "send_code_button",
                    "display_name": "发送验证码按钮",
                    "description": "获取短信验证码按钮",
                    "selectors": [
                        {"type": "css", "value": ".send-code"},
                        {"type": "text", "value": "获取验证码"}
                    ],
                    "action_type": "click"
                }
            ]
        },

        # ========== 商品发布页面 ==========
        "publish": {
            "page_name": "商品发布页",
            "elements": [
                {
                    "name": "title_input",
                    "display_name": "商品标题输入框",
                    "description": "商品标题/名称输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='goods_name']"},
                        {"type": "css", "value": "input[placeholder*='商品名称']"},
                        {"type": "css", "value": "input[placeholder*='商品标题']"},
                        {"type": "css", "value": ".goods-name-input"},
                        {"type": "xpath", "value": "//input[contains(@placeholder,'商品名称')]"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "price_input",
                    "display_name": "商品价格输入框",
                    "description": "商品价格输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='price']"},
                        {"type": "css", "value": "input[placeholder*='价格']"},
                        {"type": "css", "value": ".goods-price-input"},
                        {"type": "xpath", "value": "//input[contains(@placeholder,'价格')]"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "stock_input",
                    "display_name": "库存数量输入框",
                    "description": "商品库存数量",
                    "selectors": [
                        {"type": "css", "value": "input[name='stock']"},
                        {"type": "css", "value": "input[placeholder*='库存']"},
                        {"type": "css", "value": ".stock-input"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "category_select",
                    "display_name": "商品类目选择",
                    "description": "商品分类/类目选择器",
                    "selectors": [
                        {"type": "css", "value": ".category-select"},
                        {"type": "css", "value": "select[name='category_id']"},
                        {"type": "xpath", "value": "//span[contains(text(),'选择类目')]"}
                    ],
                    "action_type": "click"
                },
                {
                    "name": "description_input",
                    "display_name": "商品描述输入框",
                    "description": "商品详情/描述编辑框",
                    "selectors": [
                        {"type": "css", "value": "textarea[name='description']"},
                        {"type": "css", "value": "textarea[placeholder*='描述']"},
                        {"type": "css", "value": ".goods-desc-editor"},
                        {"type": "css", "value": ".editor-content"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "image_upload",
                    "display_name": "图片上传按钮",
                    "description": "商品图片上传入口",
                    "selectors": [
                        {"type": "css", "value": ".upload-btn"},
                        {"type": "css", "value": ".image-upload"},
                        {"type": "css", "value": "input[type='file']"},
                        {"type": "xpath", "value": "//span[contains(text(),'上传图片')]"}
                    ],
                    "action_type": "upload"
                },
                {
                    "name": "submit_button",
                    "display_name": "提交/发布按钮",
                    "description": "提交商品发布",
                    "selectors": [
                        {"type": "css", "value": "button[type='submit']"},
                        {"type": "css", "value": ".submit-btn"},
                        {"type": "css", "value": ".publish-btn"},
                        {"type": "text", "value": "提交"},
                        {"type": "text", "value": "发布"},
                        {"type": "xpath", "value": "//button[contains(text(),'发布')]"}
                    ],
                    "action_type": "click"
                }
            ]
        },

        # ========== 发布成功页面 ==========
        "publish_success": {
            "page_name": "发布成功页",
            "elements": [
                {
                    "name": "product_id",
                    "display_name": "商品ID",
                    "description": "平台生成的商品ID",
                    "selectors": [
                        {"type": "css", "value": "#goods_id"},
                        {"type": "css", "value": "[data-goods-id]"},
                        {"type": "css", "value": ".goods-id"},
                        {"type": "css", "value": "[class*='goodsId']"},
                        {"type": "xpath", "value": "//*[contains(@class,'goods-id')]"},
                        {"type": "xpath", "value": "//*[contains(@data-goods-id,'')]"}
                    ],
                    "action_type": "extract",
                    "extract_type": "text"
                },
                {
                    "name": "product_url",
                    "display_name": "商品链接",
                    "description": "商品详情页链接",
                    "selectors": [
                        {"type": "css", "value": ".goods-link"},
                        {"type": "css", "value": ".goods-detail-link"},
                        {"type": "css", "value": "a[href*='goods']"},
                        {"type": "xpath", "value": "//a[contains(@href,'goods')]"}
                    ],
                    "action_type": "extract",
                    "extract_type": "href"
                },
                {
                    "name": "title",
                    "display_name": "商品标题",
                    "description": "发布的商品标题",
                    "selectors": [
                        {"type": "css", "value": ".goods-title"},
                        {"type": "css", "value": ".item-title"},
                        {"type": "css", "value": "[class*='title']"},
                        {"type": "xpath", "value": "//*[contains(@class,'title')]"}
                    ],
                    "action_type": "extract",
                    "extract_type": "text"
                },
                {
                    "name": "price",
                    "display_name": "商品价格",
                    "description": "发布的商品价格",
                    "selectors": [
                        {"type": "css", "value": ".goods-price"},
                        {"type": "css", "value": ".price"},
                        {"type": "css", "value": "[class*='price']"},
                        {"type": "xpath", "value": "//*[contains(@class,'price')]"}
                    ],
                    "action_type": "extract",
                    "extract_type": "text"
                },
                {
                    "name": "success_message",
                    "display_name": "成功提示",
                    "description": "发布成功的提示信息",
                    "selectors": [
                        {"type": "css", "value": ".success-tip"},
                        {"type": "css", "value": ".success-message"},
                        {"type": "text", "value": "发布成功"}
                    ],
                    "action_type": "extract",
                    "extract_type": "text"
                }
            ]
        },

        # ========== 商品详情页面 ==========
        "product_detail": {
            "page_name": "商品详情页",
            "elements": [
                {
                    "name": "detail_product_id",
                    "display_name": "商品ID",
                    "description": "商品详情页的商品ID",
                    "selectors": [
                        {"type": "css", "value": "#goodsId"},
                        {"type": "css", "value": "[data-goods-id]"},
                        {"type": "xpath", "value": "//*[contains(@class,'goods-id')]"}
                    ],
                    "action_type": "extract"
                },
                {
                    "name": "detail_title",
                    "display_name": "商品标题",
                    "selectors": [
                        {"type": "css", "value": ".goods-title"},
                        {"type": "css", "value": "h1.title"}
                    ],
                    "action_type": "extract"
                },
                {
                    "name": "detail_price",
                    "display_name": "商品价格",
                    "selectors": [
                        {"type": "css", "value": ".goods-price"},
                        {"type": "css", "value": ".price"}
                    ],
                    "action_type": "extract"
                }
            ]
        }
    }
}


# ==================== 抖音平台 ====================
DOUYIN_ELEMENTS = {
    "platform": "douyin",
    "platform_name": "抖音",
    "pages": {
        "login": {
            "page_name": "登录页",
            "elements": [
                {
                    "name": "username_input",
                    "display_name": "用户名输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='username']"},
                        {"type": "css", "value": "input[placeholder*='手机']"},
                        {"type": "xpath", "value": "//input[@type='text']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "password_input",
                    "display_name": "密码输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='password']"},
                        {"type": "css", "value": "input[type='password']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "login_button",
                    "display_name": "登录按钮",
                    "selectors": [
                        {"type": "css", "value": "button[type='submit']"},
                        {"type": "text", "value": "登录"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish": {
            "page_name": "商品发布页",
            "elements": [
                {
                    "name": "title_input",
                    "display_name": "商品标题输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='title']"},
                        {"type": "css", "value": "input[placeholder*='标题']"},
                        {"type": "css", "value": ".title-input"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "price_input",
                    "display_name": "商品价格输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='price']"},
                        {"type": "css", "value": "input[placeholder*='价格']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "image_upload",
                    "display_name": "图片上传",
                    "selectors": [
                        {"type": "css", "value": ".upload-btn"},
                        {"type": "css", "value": "input[type='file']"}
                    ],
                    "action_type": "upload"
                },
                {
                    "name": "submit_button",
                    "display_name": "提交发布按钮",
                    "selectors": [
                        {"type": "css", "value": ".submit-btn"},
                        {"type": "text", "value": "发布"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish_success": {
            "page_name": "发布成功页",
            "elements": [
                {
                    "name": "product_id",
                    "display_name": "商品ID",
                    "selectors": [
                        {"type": "css", "value": "[data-product-id]"},
                        {"type": "css", "value": ".product-id"},
                        {"type": "xpath", "value": "//*[contains(@data-product-id,'')]"}
                    ],
                    "action_type": "extract"
                },
                {
                    "name": "product_url",
                    "display_name": "商品链接",
                    "selectors": [
                        {"type": "css", "value": "a[href*='product']"}
                    ],
                    "action_type": "extract",
                    "extract_type": "href"
                },
                {
                    "name": "title",
                    "display_name": "商品标题",
                    "selectors": [
                        {"type": "css", "value": ".product-title"},
                        {"type": "css", "value": "[class*='title']"}
                    ],
                    "action_type": "extract"
                }
            ]
        }
    }
}


# ==================== 淘宝平台 ====================
TAOBAO_ELEMENTS = {
    "platform": "taobao",
    "platform_name": "淘宝",
    "pages": {
        "login": {
            "page_name": "登录页",
            "elements": [
                {
                    "name": "username_input",
                    "display_name": "用户名输入框",
                    "selectors": [
                        {"type": "css", "value": "#fm-login-id"},
                        {"type": "css", "value": "#username"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "password_input",
                    "display_name": "密码输入框",
                    "selectors": [
                        {"type": "css", "value": "#password"},
                        {"type": "css", "value": "input[type='password']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "login_button",
                    "display_name": "登录按钮",
                    "selectors": [
                        {"type": "css", "value": ".password-login-tab"},
                        {"type": "text", "value": "登录"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish": {
            "page_name": "商品发布页",
            "elements": [
                {
                    "name": "title_input",
                    "display_name": "商品标题输入框",
                    "selectors": [
                        {"type": "css", "value": "#itemTitle"},
                        {"type": "css", "value": "input[name='title']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "price_input",
                    "display_name": "商品价格输入框",
                    "selectors": [
                        {"type": "css", "value": "#price"},
                        {"type": "css", "value": "input[name='price']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "submit_button",
                    "display_name": "提交按钮",
                    "selectors": [
                        {"type": "css", "value": ".publish-btn"},
                        {"type": "text", "value": "发布"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish_success": {
            "page_name": "发布成功页",
            "elements": [
                {
                    "name": "product_id",
                    "display_name": "商品ID",
                    "selectors": [
                        {"type": "css", "value": "#itemId"},
                        {"type": "css", "value": "[data-item-id]"}
                    ],
                    "action_type": "extract"
                },
                {
                    "name": "product_url",
                    "display_name": "商品链接",
                    "selectors": [
                        {"type": "css", "value": ".item-link"},
                        {"type": "css", "value": "a[href*='item']"}
                    ],
                    "action_type": "extract",
                    "extract_type": "href"
                }
            ]
        }
    }
}


# ==================== 京东平台 ====================
JD_ELEMENTS = {
    "platform": "jd",
    "platform_name": "京东",
    "pages": {
        "login": {
            "page_name": "登录页",
            "elements": [
                {
                    "name": "username_input",
                    "display_name": "用户名输入框",
                    "selectors": [
                        {"type": "css", "value": "#username"},
                        {"type": "css", "value": "input[name='username']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "password_input",
                    "display_name": "密码输入框",
                    "selectors": [
                        {"type": "css", "value": "#password"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "login_button",
                    "display_name": "登录按钮",
                    "selectors": [
                        {"type": "css", "value": ".login-btn"},
                        {"type": "text", "value": "登录"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish": {
            "page_name": "商品发布页",
            "elements": [
                {
                    "name": "title_input",
                    "display_name": "商品标题输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='name']"},
                        {"type": "css", "value": ".product-name"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "price_input",
                    "display_name": "商品价格输入框",
                    "selectors": [
                        {"type": "css", "value": "input[name='price']"}
                    ],
                    "action_type": "input"
                },
                {
                    "name": "submit_button",
                    "display_name": "提交按钮",
                    "selectors": [
                        {"type": "css", "value": ".submit-btn"},
                        {"type": "text", "value": "提交"}
                    ],
                    "action_type": "click"
                }
            ]
        },
        "publish_success": {
            "page_name": "发布成功页",
            "elements": [
                {
                    "name": "product_id",
                    "display_name": "商品SKU",
                    "selectors": [
                        {"type": "css", "value": "[data-sku]"},
                        {"type": "css", "value": ".sku-id"}
                    ],
                    "action_type": "extract"
                },
                {
                    "name": "product_url",
                    "display_name": "商品链接",
                    "selectors": [
                        {"type": "css", "value": "a[href*='product']"}
                    ],
                    "action_type": "extract",
                    "extract_type": "href"
                }
            ]
        }
    }
}


# ==================== 汇总导出 ====================
ALL_PLATFORM_ELEMENTS = {
    "pinduoduo": PINDUODUO_ELEMENTS,
    "douyin": DOUYIN_ELEMENTS,
    "taobao": TAOBAO_ELEMENTS,
    "jd": JD_ELEMENTS
}


# ==================== 页面类型说明 ====================
PAGE_TYPES = {
    "login": {
        "name": "登录页",
        "description": "平台登录页面，包含用户名、密码、验证码输入"
    },
    "publish": {
        "name": "商品发布页",
        "description": "填写商品信息页面，包含标题、价格、图片等"
    },
    "publish_success": {
        "name": "发布成功页",
        "description": "发布成功后页面，用于提取商品ID、链接等信息"
    },
    "product_detail": {
        "name": "商品详情页",
        "description": "商品详情展示页面"
    },
    "order_list": {
        "name": "订单列表页",
        "description": "订单管理列表页面"
    },
    "order_detail": {
        "name": "订单详情页",
        "description": "单个订单详情页面"
    }
}


# ==================== 提取字段映射 ====================
EXTRACT_FIELD_MAPPING = {
    "product_id": {
        "name": "商品ID",
        "description": "平台生成的唯一商品标识",
        "required": True
    },
    "product_url": {
        "name": "商品链接",
        "description": "商品详情页URL",
        "required": True
    },
    "title": {
        "name": "商品标题",
        "description": "商品展示标题",
        "required": True
    },
    "price": {
        "name": "商品价格",
        "description": "商品销售价格",
        "required": False
    },
    "stock": {
        "name": "库存数量",
        "description": "商品库存",
        "required": False
    }
}
