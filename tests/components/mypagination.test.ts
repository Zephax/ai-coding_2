import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MyPagination from '@/components/MyPagination.vue'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  pageSizes?: number[]
  disabled?: boolean
}

function mountPagination(props: Partial<PaginationProps> = {}) {
  return mount(MyPagination, {
    props: { total: 25, page: 1, pageSize: 10, ...props },
  })
}

describe('MyPagination', () => {
  describe('渲染', () => {
    it('按 total / pageSize 计算总页数并展示当前页', () => {
      const wrapper = mountPagination({ total: 25, page: 2 })

      expect(wrapper.find('.page-indicator').text()).toBe('第 2 / 3 页')
    })

    it('total 为 0 时按 1 页展示，并禁用翻页', () => {
      const wrapper = mountPagination({ total: 0, page: 1 })
      const buttons = wrapper.findAll('.page-button')

      expect(wrapper.find('.page-indicator').text()).toBe('第 1 / 1 页')
      expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    })

    it('pageSize 不在预设列表中时补成选项，避免下拉显示空白', () => {
      const wrapper = mountPagination({ pageSize: 15 })
      const options = wrapper.findAll('option').map((option) => option.text())

      expect(options).toEqual(['10 条/页', '15 条/页', '20 条/页', '50 条/页'])
      expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('15')
    })
  })

  describe('点击翻页', () => {
    it('点击下一页发出 update:page 与 change', async () => {
      const wrapper = mountPagination({ page: 1 })

      await wrapper.findAll('.page-button')[1]!.trigger('click')

      expect(wrapper.emitted('update:page')).toEqual([[2]])
      expect(wrapper.emitted('change')).toEqual([[{ page: 2, pageSize: 10 }]])
    })

    it('点击上一页发出 update:page 与 change', async () => {
      const wrapper = mountPagination({ page: 2 })

      await wrapper.findAll('.page-button')[0]!.trigger('click')

      expect(wrapper.emitted('update:page')).toEqual([[1]])
      expect(wrapper.emitted('change')).toEqual([[{ page: 1, pageSize: 10 }]])
    })

    it('第一页禁用上一页，最后一页禁用下一页', () => {
      const firstPage = mountPagination({ page: 1 })
      const [firstPrev, firstNext] = firstPage.findAll('.page-button')

      expect(firstPrev!.attributes('disabled')).toBeDefined()
      expect(firstNext!.attributes('disabled')).toBeUndefined()

      const lastPage = mountPagination({ page: 3 })
      const [lastPrev, lastNext] = lastPage.findAll('.page-button')

      expect(lastPrev!.attributes('disabled')).toBeUndefined()
      expect(lastNext!.attributes('disabled')).toBeDefined()
    })

    it('disabled 为 true 时按钮与下拉都禁用，点击不发出事件', async () => {
      const wrapper = mountPagination({ page: 2, disabled: true })
      const buttons = wrapper.findAll('.page-button')

      expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
      expect(wrapper.find('select').attributes('disabled')).toBeDefined()

      await buttons[0]!.trigger('click')

      expect(wrapper.emitted('update:page')).toBeUndefined()
      expect(wrapper.emitted('change')).toBeUndefined()
    })
  })

  describe('每页条数', () => {
    it('修改每页条数时页码归 1，并发出三个事件', async () => {
      const wrapper = mountPagination({ page: 3 })

      await wrapper.find('select').setValue('20')

      expect(wrapper.emitted('update:pageSize')).toEqual([[20]])
      expect(wrapper.emitted('update:page')).toEqual([[1]])
      expect(wrapper.emitted('change')).toEqual([[{ page: 1, pageSize: 20 }]])
    })
  })

  describe('边界收敛', () => {
    it('页码超过总页数时展示最后一页', () => {
      const wrapper = mountPagination({ total: 25, page: 99 })

      expect(wrapper.find('.page-indicator').text()).toBe('第 3 / 3 页')
    })

    it('总页数变小导致页码越界时，回写 update:page 到合法页码', async () => {
      const wrapper = mountPagination({ total: 25, page: 3 })

      await wrapper.setProps({ total: 5 })

      expect(wrapper.emitted('update:page')).toEqual([[1]])
      expect(wrapper.find('.page-indicator').text()).toBe('第 1 / 1 页')
    })
  })
})
