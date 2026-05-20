
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Home from '@/views/Home.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { NButton, NCard, NIcon } from 'naive-ui'

// Mock vue-router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
    useRoute: () => ({
      path: '/',
    }),
  }
})

describe('Home.vue', () => {
  let wrapper: any
  
  beforeEach(() => {
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

  it('renders the home page correctly', () => {
    expect(wrapper.find('.home-container').exists()).toBe(true)
  })

  it('displays welcome message', () => {
    expect(wrapper.text()).toContain('电商助手')
  })

  it('displays smart assistant button', () => {
    const buttons = wrapper.findAllComponents(NButton)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays status cards', () => {
    const cards = wrapper.findAllComponents(NCard)
    expect(cards.length).toBeGreaterThan(0)
  })
})

