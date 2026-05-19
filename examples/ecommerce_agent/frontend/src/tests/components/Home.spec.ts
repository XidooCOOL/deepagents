
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '@/views/Home.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { NButton, NCard, NIcon } from 'naive-ui'

// Mock vue-router
vi.mock('vue-router', async () =&gt; {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () =&gt; ({
      push: vi.fn(),
    }),
    useRoute: () =&gt; ({
      path: '/',
    }),
  }
})

describe('Home.vue', () =&gt; {
  let wrapper: any
  
  beforeEach(() =&gt; {
    wrapper = mount(Home, {
      global: {
        components: {
          NButton,
          NCard,
          NIcon,
        },
      },
    })
  })

  it('renders the home page correctly', () =&gt; {
    expect(wrapper.find('.home-container').exists()).toBe(true)
  })

  it('displays welcome message', () =&gt; {
    expect(wrapper.text()).toContain('电商助手')
  })

  it('displays smart assistant button', () =&gt; {
    const buttons = wrapper.findAllComponents(NButton)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays status cards', () =&gt; {
    const cards = wrapper.findAllComponents(NCard)
    expect(cards.length).toBeGreaterThan(0)
  })
})

