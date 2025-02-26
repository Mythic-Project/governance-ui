/**
 * @jest-environment jsdom
 */
import React from 'react'
import Home from '../../pages/index'
import { render, waitFor } from '@testing-library/react'
import singletonRouter from 'next/router'
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const Index = () => {
  const router = useRouter();
  const REALM = process.env.REALM;

  useEffect(() => {
    const mainUrl = REALM ? `/dao/${REALM}` : '/realms';
    if (!router.asPath.includes(mainUrl)) {
      router.replace(mainUrl);
    }
  }, [REALM, router]);

  return null;
};

export default Index;
const originalRealm = process.env.REALM

describe('Home page redirects to', () => {
  afterEach(() => {
    process.env.REALM = originalRealm
  })

  const originalError = console.error
  beforeAll(() => {
    console.error = (...args) => {
      if (
        /Warning: ReactDOM.render is no longer supported in React 18./.test(
          args[0],
        )
      ) {
        return
      }
      originalError.call(console, ...args)
    }
  })

  afterAll(() => {
    console.error = originalError
  })
  test('/realms when process.env.REALM is not set', async () => {
    delete process.env.REALM
    render(<Home />)

    await waitFor(() => {
      expect(singletonRouter).toMatchObject({
        pathname: '/realms',
      })
    })
  })

  test(`/dao/MNGO when process.env.REALM = 'MNGO'`, async () => {
    process.env.REALM = 'MNGO'
    render(<Home />)

    await waitFor(() => {
      expect(singletonRouter).toMatchObject({
        pathname: '/dao/MNGO',
      })
    })
  })

  test.todo(`/realms when process.env.REALM is not a valid realm symbol`)
})
